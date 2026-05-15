import { Command, Ctx, Update } from 'nestjs-telegraf';
import type { BubbleMapApiService } from 'src/bubble-map/services/bubble-map-api.service';
import type { Chain } from 'src/types';
import { Markup } from 'telegraf';

@Update()
export class SettingsUpdate {
  constructor(private readonly bubblemapApiService: BubbleMapApiService) {}

  @Command('settings')
  async settings(@Ctx() ctx) {
    try {
      const defaultChain = ctx.session.defaultChain || 'eth';

      const message = `
*Settings* ⚙️
*Default Chain:* ${this.bubblemapApiService.chainNames[defaultChain].name} \\(${defaultChain}\\)
*Watchlist:* ${ctx.session.watchlist?.length || 0} tokens
`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Close', 'close')],
      ]);

      await ctx.replyWithMarkdownV2(message, {
        reply_markup: keyboard.reply_markup,
      });
    } catch (error) {
      ctx.reply(error.message || 'An error occurred while fetching settings.');
    }
  }

  @Command('set_default_chain')
  async setDefaultChain(@Ctx() ctx) {
    try {
      const chain = ctx.payload?.trim?.() as Chain;

      const validChains = Object.keys(this.bubblemapApiService.chainNames);

      if (!validChains.includes(chain)) {
        await ctx.replyWithMarkdownV2(
          '*Invalid chain specified*\\.\n\n' +
            '*Supported chains:*\n' +
            Object.entries(this.bubblemapApiService.chainNames)
              .map(([chain, metadata]) => `• \`${chain}\` \\- ${metadata.name}`)
              .join('\n') +
            '\n\n*Example usage:*\n`/set\\_default\\_chain eth`',
        );
        return;
      }

      ctx.session.defaultChain = chain;

      await ctx.reply(
        'Default chain successfully set to ' +
          this.bubblemapApiService.chainNames[chain].name,
      );
    } catch (error) {
      await ctx.reply(
        error.message || 'An error occurred while setting the default chain.',
      );
    }
  }
}
