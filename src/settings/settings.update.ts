import { Command, Ctx, Update } from 'nestjs-telegraf';
import { BubbleMapApiService } from 'src/bubble-map/services/bubble-map-api.service';
import { Chain } from 'src/types';

@Update()
export class SettingsUpdate {
  constructor(private readonly bubblemapApiService: BubbleMapApiService) {}

  @Command('set_default_chain')
  async setDefaultChain(@Ctx() ctx) {
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
  }
}
