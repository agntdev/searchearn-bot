import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { centsToUsd, now, getAdminId } from "../data.js";

const composer = new Composer<Ctx>();

composer.command("referral", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) {
    await ctx.reply("Tap /start to begin.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const botUsername = ctx.me.username;
  const referralLink = `https://t.me/${botUsername}?start=${user.referral_code}`;
  const creditedCount = Object.values(ctx.session.data.referrals).filter(
    (r) => r.referrer_id === userId && r.status === "credited",
  ).length;
  const pendingCount = user.referral_ids.length - creditedCount;
  const earnings = creditedCount * 1;

  const text =
    `🔗 Referral program\n\n` +
    `Share your link and earn $0.01 for each friend who stays 24h.\n\n` +
    `Your link:\n${referralLink}\n\n` +
    `Earned: ${centsToUsd(earnings)} (${creditedCount} referrals)\n` +
    `Pending: ${pendingCount}`;

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

// Handle referral code from deep link (/start <code>)
composer.callbackQuery(/^referral:track:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const referralCode = ctx.match[1];
  const userId = ctx.from?.id;
  if (!userId) return;

  // Find the referrer by referral code
  const referrerId = Object.values(ctx.session.data.users).find(
    (u) => u.referral_code === referralCode,
  )?.id;

  if (!referrerId || referrerId === userId) {
    await ctx.editMessageText("Invalid referral link.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  // Check for self-referral
  if (referrerId === userId) {
    await ctx.editMessageText("You can't refer yourself!", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  // Check for duplicate referral
  const existingReferral = Object.values(ctx.session.data.referrals).find(
    (r) => r.referred_user_id === userId,
  );
  if (existingReferral) {
    await ctx.editMessageText("You've already been referred by someone.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  // Record the referral
  const referralId = Date.now();
  ctx.session.data.referrals[referralId] = {
    referrer_id: referrerId,
    referred_user_id: userId,
    timestamp: now(),
    status: "pending",
  };

  // Add to referrer's referral list
  if (ctx.session.data.users[referrerId]) {
    ctx.session.data.users[referrerId].referral_ids.push(userId);
  }

  // Notify admin about new referral
  const adminId = getAdminId();
  if (adminId) {
    try {
      await ctx.api.sendMessage(
        adminId,
        `New referral: user ${userId} referred by user ${referrerId}. Status: pending (24h retention check).`,
      );
    } catch {
      // Admin may not have started the bot — don't break the flow
    }
  }

  await ctx.editMessageText("Thanks for joining through a referral!", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
