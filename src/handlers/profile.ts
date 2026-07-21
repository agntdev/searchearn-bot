import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { centsToUsd } from "../data.js";

const composer = new Composer<Ctx>();

composer.command("profile", async (ctx) => {
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
    `Referrals: ${creditedCount} earned, ${pendingCount} pending\n\n` +
    `Theme: ${themeLabel}`;

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([
      [inlineButton(`Toggle theme (${nextTheme})`, "profile:toggle_theme")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("profile:toggle_theme", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = ctx.session.data.users[userId];
  if (!user) return;

  user.theme = user.theme === "dark" ? "light" : "dark";
  const themeLabel = user.theme === "dark" ? "🌙 Dark" : "☀️ Light";
  const nextTheme = user.theme === "dark" ? "light" : "dark";

  const text =
    `👤 Your profile\n\n` +
    `Balance: ${centsToUsd(user.balance_cents)}\n` +
    `Referrals: ${user.referral_ids.length} total\n\n` +
    `Theme: ${themeLabel}`;

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([
      [inlineButton(`Toggle theme (${nextTheme})`, "profile:toggle_theme")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
