import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { centsToUsd, generateWithdrawalId, now, getAdminId } from "../data.js";

const composer = new Composer<Ctx>();

composer.command("withdraw", async (ctx) => {
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

  if (user.balance_cents < 1000) {
    await ctx.reply(
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
  const maxAmount = Math.min(user.balance_cents, 50000);
  await ctx.reply(
    `How much would you like to withdraw? (Between $10.00 and $${(maxAmount / 100).toFixed(2)})`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Cancel", "menu:main")],
      ]),
    },
  );
});

// Step 1: Collect withdrawal amount
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_withdraw_amount") return next();

  const text = ctx.message.text.trim();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

  // Parse amount — accept both "$10.00" and "10.00" and "10"
  const cleaned = text.replace(/[$,]/g, "");
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    await ctx.reply("That doesn't look like a valid amount. Try a number like 10.00.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Cancel", "menu:main")],
      ]),
    });
    return;
  }

  const amountCents = Math.round(amount * 100);

  if (amountCents < 1000) {
    await ctx.reply("The minimum withdrawal is $10.00. Try a higher amount.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Cancel", "menu:main")],
      ]),
    });
    return;
  }

  if (amountCents > 50000) {
    await ctx.reply("The maximum withdrawal is $500.00. Try a lower amount.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Cancel", "menu:main")],
      ]),
    });
    return;
  }

  if (amountCents > user.balance_cents) {
    await ctx.reply(
      `You only have ${centsToUsd(user.balance_cents)} available. Try a lower amount.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Cancel", "menu:main")],
        ]),
      },
    );
    return;
  }

  // Store amount and move to payment method step
  ctx.session.step = "awaiting_withdraw_method";
  ctx.session.withdrawalAmount = amountCents;

  await ctx.reply(`How would you like to receive ${centsToUsd(amountCents)}?`, {
    reply_markup: inlineKeyboard([
      [inlineButton("USDT", "withdraw:method:usdt")],
      [inlineButton("PayPal", "withdraw:method:paypal")],
      [inlineButton("Bank Transfer", "withdraw:method:bank")],
      [inlineButton("⬅️ Cancel", "menu:main")],
    ]),
  });
});

// Step 2: Payment method buttons
composer.callbackQuery(/^withdraw:method:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const method = ctx.match[1];
  const userId = ctx.from?.id;
  if (!userId) return;

  ctx.session.step = "awaiting_withdraw_details";
  ctx.session.withdrawalMethod = method;

  const methodLabel =
    method === "usdt"
      ? "USDT wallet address"
      : method === "paypal"
        ? "PayPal email"
        : "Bank account details (account number + routing)";

  await ctx.editMessageText(`Please provide your ${methodLabel}:`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Cancel", "menu:main")],
    ]),
  });
});

// Step 3: Collect payment details and submit
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_withdraw_details") return next();

  const details = ctx.message.text.trim();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

  if (!details) {
    await ctx.reply("Please provide your payment details.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Cancel", "menu:main")],
      ]),
    });
    return;
  }

  const amountCents = ctx.session.withdrawalAmount ?? 0;
  const method = ctx.session.withdrawalMethod ?? "unknown";

  // Create withdrawal request
  const withdrawalId = generateWithdrawalId();
  ctx.session.data.withdrawals[withdrawalId] = {
    id: withdrawalId,
    user_id: userId,
    amount_cents: amountCents,
    method,
    details,
    status: "pending",
    created_at: now(),
    admin_notes: "",
  };

  // Deduct from balance
  user.balance_cents -= amountCents;

  // Clear flow state
  ctx.session.step = undefined;
  ctx.session.withdrawalAmount = undefined;
  ctx.session.withdrawalMethod = undefined;

  const methodLabel =
    method === "usdt"
      ? "USDT"
      : method === "paypal"
        ? "PayPal"
        : "Bank Transfer";

  // Notify admin
  const adminId = getAdminId();
  if (adminId) {
    try {
      await ctx.api.sendMessage(
        adminId,
        `💸 Withdrawal request\n\nUser: ${userId}\nAmount: ${centsToUsd(amountCents)}\nMethod: ${methodLabel}\nDetails: ${details}\n\nRequest ID: ${withdrawalId}`,
        {
          reply_markup: inlineKeyboard([
            [
              inlineButton("✅ Approve", `admin:approve_withdrawal:${withdrawalId}`),
              inlineButton("❌ Reject", `admin:reject_withdrawal:${withdrawalId}`),
            ],
          ]),
        },
      );
    } catch {
      // Admin may not have started the bot
    }
  }

  await ctx.reply(
    `Withdrawal request submitted!\n\nAmount: ${centsToUsd(amountCents)}\nMethod: ${methodLabel}\n\nWe'll process this within 48 hours. You'll be notified when it's approved.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
