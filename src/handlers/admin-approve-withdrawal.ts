import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { centsToUsd } from "../data.js";

const composer = new Composer<Ctx>();

composer.callbackQuery(/^admin:approve_withdrawal:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const withdrawalId = ctx.match[1];
  const withdrawal = ctx.session.data.withdrawals[withdrawalId];

  if (!withdrawal) {
    await ctx.editMessageText("Withdrawal request not found.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  if (withdrawal.status !== "pending") {
    await ctx.editMessageText(`This withdrawal has already been ${withdrawal.status}.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  // Approve the withdrawal
  withdrawal.status = "approved";
  withdrawal.admin_notes = `Approved by admin at ${new Date().toISOString()}`;

  // Notify the user
  try {
    await ctx.api.sendMessage(
      withdrawal.user_id,
      `✅ Your withdrawal of ${centsToUsd(withdrawal.amount_cents)} has been approved! The payout will be processed shortly.`,
    );
  } catch {
    // User may have blocked the bot
  }

  await ctx.editMessageText(
    `✅ Withdrawal approved\n\nUser: ${withdrawal.user_id}\nAmount: ${centsToUsd(withdrawal.amount_cents)}\nMethod: ${withdrawal.method}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^admin:reject_withdrawal:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const withdrawalId = ctx.match[1];
  const withdrawal = ctx.session.data.withdrawals[withdrawalId];

  if (!withdrawal) {
    await ctx.editMessageText("Withdrawal request not found.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  if (withdrawal.status !== "pending") {
    await ctx.editMessageText(`This withdrawal has already been ${withdrawal.status}.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  // Reject the withdrawal
  withdrawal.status = "rejected";
  withdrawal.admin_notes = `Rejected by admin at ${new Date().toISOString()}`;

  // Refund the balance
  const user = ctx.session.data.users[withdrawal.user_id];
  if (user) {
    user.balance_cents += withdrawal.amount_cents;
  }

  // Notify the user
  try {
    await ctx.api.sendMessage(
      withdrawal.user_id,
      `Your withdrawal of ${centsToUsd(withdrawal.amount_cents)} was not approved. The amount has been returned to your balance.`,
    );
  } catch {
    // User may have blocked the bot
  }

  await ctx.editMessageText(
    `❌ Withdrawal rejected\n\nUser: ${withdrawal.user_id}\nAmount: ${centsToUsd(withdrawal.amount_cents)}\nMethod: ${withdrawal.method}\n\nBalance refunded.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

// Legacy callbacks without the withdrawal ID
composer.callbackQuery("admin:approve_withdrawal", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("No pending withdrawal specified.", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("admin:reject_withdrawal", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("No pending withdrawal specified.", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
