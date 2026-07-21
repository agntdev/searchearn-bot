import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { centsToUsd } from "../data.js";

const composer = new Composer<Ctx>();

composer.command("balance", async (ctx) => {
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

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("💸 Withdraw", "menu:withdraw")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
