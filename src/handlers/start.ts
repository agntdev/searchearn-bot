import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuKeyboard,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { generateReferralCode, centsToUsd, now } from "../data.js";

registerMainMenuItem({ label: "🔍 Search", data: "menu:search", order: 10 });
registerMainMenuItem({ label: "👤 Profile", data: "menu:profile", order: 20 });
registerMainMenuItem({ label: "🔗 Referral", data: "menu:referral", order: 30 });
registerMainMenuItem({ label: "💰 Balance", data: "menu:balance", order: 40 });
registerMainMenuItem({ label: "💸 Withdraw", data: "menu:withdraw", order: 50 });

const WELCOME = "👋 Welcome! Tap a button below to get started.";

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!ctx.session.data.users[userId]) {
    ctx.session.data.users[userId] = {
      id: userId,
      username: ctx.from?.username,
      referral_code: generateReferralCode(userId),
      registration_time: now(),
      balance_cents: 0,
      search_history: [],
      referral_ids: [],
      theme: "light",
    };
  }

  const user = ctx.session.data.users[userId];
  const balance = centsToUsd(user.balance_cents);

  await ctx.reply(`${WELCOME}\n\nYour balance: ${balance}`, {
    reply_markup: mainMenuKeyboard(),
  });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  const balance =
    userId && ctx.session.data.users[userId]
      ? centsToUsd(ctx.session.data.users[userId].balance_cents)
      : "$0.00";
  await ctx.editMessageText(`${WELCOME}\n\nYour balance: ${balance}`, {
    reply_markup: mainMenuKeyboard(),
  });
});

composer.callbackQuery("menu:search", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_search_query";
  await ctx.editMessageText("What would you like to search for?", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("menu:profile", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

  const referredCount = user.referral_ids.length;
  const creditedCount = Object.values(ctx.session.data.referrals).filter(
    (r) => r.referrer_id === userId && r.status === "credited",
  ).length;
  const pendingCount = referredCount - creditedCount;

  const themeLabel = user.theme === "dark" ? "🌙 Dark" : "☀️ Light";
  const nextTheme = user.theme === "dark" ? "light" : "dark";

  const text =
    `👤 Your profile\n\n` +
    `Balance: ${centsToUsd(user.balance_cents)}\n` +
    `Referrals: ${creditedCount} earned, ${pendingCount} pending\n` +
    `Member since: ${new Date(user.registration_time).toLocaleDateString()}\n\n` +
    `Theme: ${themeLabel}`;

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([
      [inlineButton(`Toggle theme (${nextTheme})`, "profile:toggle_theme")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("menu:referral", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

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

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("menu:balance", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

  const creditedCount = Object.values(ctx.session.data.referrals).filter(
    (r) => r.referrer_id === userId && r.status === "credited",
  ).length;
  const pendingCount = user.referral_ids.length - creditedCount;
  const earnings = creditedCount * 1;
  const pendingEarnings = pendingCount * 1;
  const pendingWithdrawals = Object.values(ctx.session.data.withdrawals).filter(
    (w) => w.user_id === userId && w.status === "pending",
  );
  const totalPending = pendingWithdrawals.reduce((s, w) => s + w.amount_cents, 0);

  const text =
    `💰 Balance breakdown\n\n` +
    `Available: ${centsToUsd(user.balance_cents)}\n` +
    `Earned from referrals: ${centsToUsd(earnings)}\n` +
    `Pending referrals: ${centsToUsd(pendingEarnings)}\n` +
    `Pending withdrawals: ${centsToUsd(totalPending)}\n\n` +
    `Each valid referral earns you $0.01. Referrals are credited after 24 hours.`;

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("💸 Withdraw", "menu:withdraw")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("menu:withdraw", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

  if (user.balance_cents < 1000) {
    await ctx.editMessageText(
      `You need at least $10.00 to withdraw. Your balance is ${centsToUsd(user.balance_cents)}.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  ctx.session.step = "awaiting_withdraw_amount";
  await ctx.editMessageText(
    `How much would you like to withdraw? (Between $10.00 and $${centsToUsd(Math.min(user.balance_cents, 50000)).slice(1)})`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Cancel", "menu:main")],
      ]),
    },
  );
});

export default composer;
