import { Action, Command, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { BubbleMapService } from './services/bubble-map.service';
import { Markup } from 'telegraf';
import { BubbleMapApiService } from './services/bubble-map-api.service';

export const BUBBLE_MAP_SCENE_ID = 'BUBBLE_MAP_SCENE_ID';

@Wizard(BUBBLE_MAP_SCENE_ID)
export default class BubbleMapScene {
  constructor(
    private readonly bubbleMapService: BubbleMapService,
    private readonly bubbleMapApiService: BubbleMapApiService,
  ) {}

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx) {
    console.log(ctx);
    // save the incoming message to the session
    ctx.wizard.state.address = ctx.message.text;

    // Create the keyboard buttons for the chains
    const chainButtons = Object.entries(
      this.bubbleMapApiService.chainNames,
    ).map(([key, value]) => Markup.button.callback(value.name, `chain_${key}`));
    const pairs = [];

    // Create pairs of buttons for the keyboard layout
    for (let i = 0; i < chainButtons.length; i += 2) {
      pairs.push(chainButtons.slice(i, i + 2));
    }

    const keyboard = Markup.inlineKeyboard([
      ...pairs,
      [Markup.button.callback('<<< Back', 'back')],
    ]);

    await ctx.reply(
      ctx.session.defaultChain
        ? 'We detected a change in chain please confirm chain once again'
        : 'Please select a chain:',
      {
        reply_markup: keyboard.reply_markup,
      },
    );
  }

  @Action(/^chain_(.+)/)
  async onChainSelected(@Ctx() ctx) {
    console.log(ctx);

    ctx.answerCbQuery();
    const chainKey = ctx.match[1];
    const chainName = this.bubbleMapApiService.chainNames[chainKey]?.name;

    if (!chainName) {
      await ctx.reply('Invalid chain selected. Please try again.');
      return;
    }

    // Save the selected chain to the session
    ctx.wizard.state.selectedChain = chainKey;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('Yes', `set_default_chain_yes`),
      Markup.button.callback('No', 'set_default_chain_no'),
    ]);

    await ctx.reply(
      `Would you like to set ${chainName} as your default chain?`,
      { reply_markup: keyboard.reply_markup },
    );
  }

  @Action(/^set_default_chain_(yes|no)$/)
  async onSetDefaultChain(@Ctx() ctx) {
    const isYes = ctx.match[1] === 'yes';
    const chain = ctx.wizard.state.selectedChain;
    const address = ctx.wizard.state.address;

    ctx.answerCbQuery('Generating your bubble map...');

    if (isYes) {
      ctx.session.defaultChain = chain;
    }

    await this.bubbleMapService.handleBubbleMapRequest(ctx, {
      chain,
      address,
    });

    await ctx.scene.leave();
  }

  @Command('exit')
  async onExit(@Ctx() ctx) {
    await ctx.scene.leave();
  }
}
