import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { searchContent, now } from "../data.js";

const composer = new Composer<Ctx>();

composer.command("search", async (ctx) => {
  ctx.session.step = "awaiting_search_query";
  await ctx.reply("Prompt for search query and return results", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_search_query") return next();

  const query = ctx.message.text.trim();
  ctx.session.step = undefined;

  if (!query) {
    await ctx.reply("Type a search query to find content.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const results = searchContent(query);

  const userId = ctx.from?.id;
  if (userId && ctx.session.data.users[userId]) {
    const entry = { query, timestamp: now(), result_count: results.length };
    ctx.session.data.users[userId].search_history.push(entry);
    ctx.session.data.search_entries.push(entry);
  }

  if (results.length === 0) {
    await ctx.reply(`No results for "${query}". Try different words?`, {
      reply_markup: inlineKeyboard([
        [inlineButton("🔍 Search again", "menu:search")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const rows = results.slice(0, 10).map((r) => [
    inlineButton(r.title, `search:result:${r.id}`),
  ]);

  await ctx.reply(`Results for "${query}":`, {
    reply_markup: inlineKeyboard([
      ...rows,
      [inlineButton("🔍 Search again", "menu:search")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
