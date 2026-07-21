import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "ℹ️ Here's how this bot works:\n\n" +
  "🔍 Search — find content by typing a query\n" +
  "👤 Profile — see your balance and stats\n" +
  "🔗 Referral — share your link, earn $0.01 per friend\n" +
  "💰 Balance — check your earnings\n" +
  "💸 Withdraw — cash out (min $10)\n\n" +
  "Tap /start to open the menu, then pick what you want from the buttons.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
