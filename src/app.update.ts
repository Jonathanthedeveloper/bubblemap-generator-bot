import { Start, Update, Ctx, Help } from 'nestjs-telegraf';
import {} from 'telegraf/typings/telegram-types';
import { BubbleMapApiService } from './bubble-map/services/bubble-map-api.service';
import { BubbleMapService } from './bubble-map/services/bubble-map.service';
import { Markup } from 'telegraf';

@Update()
export class AppUpdate {
  constructor(
    private readonly bubblemapApiService: BubbleMapApiService,
    private readonly bubbleMapService: BubbleMapService,
  ) {}

  @Start()
  async start(@Ctx() ctx) {
    await ctx.replyWithMarkdownV2(
      'Welcome to the Bubble Map Generator Bot\\!\n\nPlease Enter a token address to proceed\\.\n\nYou can also send a message with the `/help` command to see the available commands\\.',
      {
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter a contract address',
        },
      },
    );
  }

  @Help()
  async help(@Ctx() ctx) {
    const message = `
*BubbleMap Bot Help* 🔍

*Commands:*
/map [chain] [address] - Generate a bubble map for a token
/watchlist - View your saved tokens
/set_default_chain [chain] - Set your default chain for the bot
/settings - View your settings
/exit - Terminate the current process
/help - Show this help message

*Supported chains:*
${Object.entries(this.bubblemapApiService.chainNames)
  .map(([chain, metadata]) => `• \`${chain}\` - ${metadata.name}`)
  .join('\n')}

*Examples:*
\`/map eth 0xc944e90c64b2c07662a292be6244bdf05cda44a7\`
\`/map sol G63cwb95F2Bq34jFwwyUpYqLb5YCMF9XgJ4gJVJTpump\`

*Tips:*
• Send any contract address directly to check it
• Use the watchlist to save tokens you're interested in
• View detailed risk reports with the 'Full Risk Report' button
`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Close', 'close')],
    ]);

    await ctx.replyWithMarkdownV2(message, {
      reply_markup: keyboard.reply_markup,
    });
  }
}
