import { Update, Ctx, Command, Hears, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import {
  Message,
  Update as UpdateType,
} from 'telegraf/typings/core/types/typegram';
import {
  BubbleMapService,
  TOKEN_ADDRESS_REGEX,
} from './services/bubble-map.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  Chain,
  MapData,
  SolanaTokenSecurityAndRiskData,
  TokenSecurityAndRiskData,
} from 'src/types';
import {
  SceneContextScene,
  WizardContext,
  WizardSessionData,
} from 'telegraf/typings/scenes';
import { BUBBLE_MAP_SCENE_ID } from './bubble-map.scene';
import { BubbleMapApiService } from './services/bubble-map-api.service';
import {
  escapeMarkdownV2,
  formatNumber,
  formatPercentage,
  shortenAddress,
} from 'src/utils';
import { GoPlusApiService } from './services/goplus-api.service';

// 1. Define your session structure
interface MySession {
  defaultChain?: Chain; // Make it optional if it might not be set initially
  // Add any other session properties you use
}

// 2. Create a custom context type combining base Context and your session
type MyContextWithMessage = Context<
  UpdateType.MessageUpdate<Message.TextMessage>
> & {
  session: MySession;
  scene: SceneContextScene<WizardContext<WizardSessionData>, WizardSessionData>;
};

@Update()
export class BubbleMapUpdate {
  constructor(
    private readonly bubbleMapService: BubbleMapService,
    private readonly bubbleMapApiService: BubbleMapApiService,
    private readonly goPlusApiService: GoPlusApiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Hears(TOKEN_ADDRESS_REGEX)
  async onWalletAddress(@Ctx() ctx: MyContextWithMessage) {
    const address = ctx.message.text?.trim();
    const chain = ctx.session.defaultChain;

    let formatMismatch = false;
    if (chain) {
      // Detect address format for inference
      const isEVMAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
      const isSolAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);

      // Check if address format matches the default chain type

      if (
        (chain !== 'sol' && isSolAddress) ||
        (chain === 'sol' && isEVMAddress)
      ) {
        formatMismatch = true;
      }
    }

    if (!chain || formatMismatch) {
      await ctx.scene.enter(BUBBLE_MAP_SCENE_ID);
      return;
    }

    await this.bubbleMapService.handleBubbleMapRequest(ctx, {
      chain: chain as Chain,
      address,
    });
  }

  @Action(/^map_([a-z]+)_(.+)$/)
  async handleMapAction(@Ctx() ctx) {
    ctx.answerCbQuery('Loading...');
    const [, chain, address] = ctx.match;
    await this.bubbleMapService.handleBubbleMapRequest(ctx, { chain, address });
  }

  @Command('map')
  async handleMapCommand(@Ctx() ctx) {
    const [chain, address] = ctx.payload.split(' ');
    console.log('Chain:', chain, 'Address:', address);
    await this.bubbleMapService.handleBubbleMapRequest(ctx, { chain, address });
  }

  @Action(/^refresh_([a-z]+)_(.+)$/)
  async onRefresh(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const [, chain, address] = ctx.match;

    ctx.answerCbQuery('Refreshing...');

    await this.bubbleMapService.handleBubbleMapRequest(
      ctx,
      {
        chain: chain as Chain,
        address,
      },
      {
        skipCache: true,
        editMessage: true,
      },
    );
  }

  @Action(/^riskreport_([a-z]+)_(.+)$/)
  async handleRiskReport(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    try {
      ctx.answerCbQuery('Loading risk report...');
      const [, chain, address] = ctx.match;

      const chainId = this.bubbleMapApiService.chainNames[chain].goPlusId;

      let goPlusApi: Promise<
        SolanaTokenSecurityAndRiskData | TokenSecurityAndRiskData
      >;

      if (chain === 'sol') {
        goPlusApi =
          this.goPlusApiService.getSolanaTokenSecurityAndRiskData(address);
      } else {
        goPlusApi = this.goPlusApiService.getTokenSecurityAndRiskData(
          chainId,
          address,
        );
      }

      const report = (await goPlusApi)[address];

      let message = '';
      let tokenName = '';
      let tokenSymbol = '';

      if (chain === 'sol') {
        const solData = report as SolanaTokenSecurityAndRiskData[string];
        tokenName = solData.metadata?.name || 'Unknown';
        tokenSymbol = solData.metadata?.symbol || 'Unknown';
      } else {
        const evmData = report as TokenSecurityAndRiskData[string];
        tokenName = evmData.token_name || 'Unknown';
        tokenSymbol = evmData.token_symbol || 'Unknown';
      }

      message += `🔍 *Token Risk Report \\- ${escapeMarkdownV2(tokenName)} \\(${escapeMarkdownV2(tokenSymbol)}\\)*\n\n`;

      if (chain === 'sol') {
        const solData = report as SolanaTokenSecurityAndRiskData[string];

        // Solana Security Section
        message += `*🔐 Solana Specific Checks*\n\n`;
        message += `${solData.mintable?.status === 'Enabled' ? '🖨️ Mintable' : '✅ Fixed Supply'}\n`;
        message += `${solData.freezable?.status === 'Enabled' ? '❄️ Freezable' : '✅ Unfreezable'}\n`;
        message += `Metadata Mutable: ${solData.metadata_mutable?.status === 'Enabled' ? '⚠️ Yes' : '✅ No'}\n`;
        message += '\n';

        // Basic Info Section (Solana)
        message += `*Basic Info*\n`;
        message += `Token Symbol: ${escapeMarkdownV2(tokenSymbol)}\n`;
        message += `Token Name: ${escapeMarkdownV2(tokenName)}\n`;
        message += `Contract: \`${escapeMarkdownV2(shortenAddress(address))}\`\n`;
        // Solana doesn't provide creator/owner in the same way as EVM via GoPlus
        message += `Creators: ${solData.creators?.length > 0 ? solData.creators.map((c) => `\`${escapeMarkdownV2(shortenAddress(c))}\``).join(', ') : 'N/A'}\n\n`;

        // Holders Section (Solana) - Reuse existing logic structure if possible
        message += `*Top Holders*\n`; // Simplified for Solana example
        message += `Holders: ${escapeMarkdownV2(formatNumber(solData.holder_count))}\n`;
        message += `Total Supply: ${escapeMarkdownV2(formatNumber(solData.total_supply))}\n`; // Adjust formatting if needed based on decimals
        const topHoldersPercent =
          solData.holders
            ?.slice(0, 10)
            .reduce((acc, h) => acc + parseFloat(h.percent), 0) || 0;
        message += `Top 10 Holdings: ${escapeMarkdownV2(formatPercentage(topHoldersPercent))}\n`;

        if (solData.holders) {
          solData.holders.slice(0, 10).forEach((holder, index) => {
            message += `${index + 1}\\. ${escapeMarkdownV2(shortenAddress(holder.account))} \\- ${escapeMarkdownV2(formatPercentage(holder.percent))}${holder.tag ? ` (${escapeMarkdownV2(holder.tag)})` : ''}\n`;
          });
        }
        message += '\n';

        // DEX Info Section (Solana)
        if (solData.dex && solData.dex.length > 0) {
          message += `*DEX Info*\n`;
          solData.dex.forEach((dex) => {
            // Adapt fields based on Solana DEX structure
            message += `${escapeMarkdownV2(dex.dex_name)}: TVL $${escapeMarkdownV2(formatNumber(dex.tvl))}\n`;
            message += `Pair/ID: ${escapeMarkdownV2(shortenAddress(dex.id))}\n`; // Assuming 'id' might be the pair address or pool id
          });
          // LP Holder info might need different logic for Solana
          const topLpPercent = solData.lp_holders?.[0]?.percent
            ? parseFloat(solData.lp_holders[0].percent)
            : 0;
          message += `Top LP Locked: ${escapeMarkdownV2(formatPercentage(topLpPercent))}\n\n`;
        }
      } else {
        // EVM Chains
        const evmData = report as TokenSecurityAndRiskData[string];

        // Contract Security Section (EVM)
        message += `*Contract Security*\n`;
        message += `${evmData.is_open_source === '1' ? '✅ Verified' : '❌ Unverified'} Contract Code\n`;
        message += `${evmData.is_proxy === '1' ? '⚠️ Proxy Contract Detected' : '🛡️ No Proxy Found'}\n`;
        message += `${evmData.is_mintable === '1' ? '🖨️ Mint Function Found' : '✅ No Mint Capability'}\n`;
        message +=
          evmData.hidden_owner === '1'
            ? 'Hidden owner detected ⚠️\n'
            : 'No hidden owner ✅\n';
        message +=
          evmData.selfdestruct === '1'
            ? 'Self\\-destruct capability ⚠️\n'
            : 'No self\\-destruct ✅\n'; // Escaped hyphen
        message +=
          evmData.owner_change_balance === '1'
            ? 'Owner can change balances ⚠️\n'
            : "Owner can't change balances ✅\n";
        message += '\n';

        // Honeypot Risk Section (EVM)
        message += `*🕵️♂️ Honeypot Analysis*\n\n`;
        message += `💸 Buy Tax: ${escapeMarkdownV2(formatPercentage(parseFloat(evmData.buy_tax)))}\n`;
        message += `💸 Sell Tax: ${escapeMarkdownV2(formatPercentage(parseFloat(evmData.sell_tax)))}\n`;
        // Transfer tax might not always be present
        if (evmData.transfer_tax) {
          message += `Transfer Tax: ${escapeMarkdownV2(formatPercentage(parseFloat(evmData.transfer_tax)))}\n`;
        }
        message +=
          evmData.is_honeypot === '1'
            ? 'HONEYPOT DETECTED 🚨\n'
            : 'No honeypot code detected ✅\n';
        message +=
          evmData.transfer_pausable === '1'
            ? 'Trading can be suspended ⚠️\n'
            : 'No trading suspension capability ✅\n';
        message +=
          evmData.cannot_sell_all === '1'
            ? 'Cannot sell all tokens ⚠️\n'
            : 'Full sells allowed ✅\n';
        message += '\n';

        // Basic Info Section (EVM)
        message += `*📋 Token Basics*\n\n`;
        message += `🏷 Symbol: ${escapeMarkdownV2(tokenSymbol)}\n`;
        message += `📛 Name: ${escapeMarkdownV2(tokenName)}\n`;
        // Use 'address' from the input context as contract address for EVM
        message += `📜 Contract: \`${escapeMarkdownV2(shortenAddress(address))}\`\n`;
        message += `📅 Creator: \`${escapeMarkdownV2(shortenAddress(evmData.creator_address))}\`\n`;
        message += `👤 Owner: ${evmData.owner_address ? `\`${escapeMarkdownV2(shortenAddress(evmData.owner_address))}\`` : 'No owner'}\n\n`;

        // Holders Section (EVM)
        message += `*🏦 Holder Distribution*\n\n`;
        message += `👥 Total Holders: ${escapeMarkdownV2(formatNumber(evmData.holder_count))}\n`;
        message += `📦 Total Supply: ${escapeMarkdownV2(formatNumber(evmData.total_supply))}\n`; // Adjust formatting if needed based on decimals
        const topHoldersPercent =
          evmData.holders
            ?.slice(0, 10)
            .reduce((acc, h) => acc + parseFloat(h.percent), 0) || 0;
        message += `* 👥Top 10 Holdings:* ${escapeMarkdownV2(formatPercentage(topHoldersPercent))}\n`;

        if (evmData.holders) {
          evmData.holders.slice(0, 10).forEach((holder, index) => {
            message += `${index + 1}\\. \`${escapeMarkdownV2(shortenAddress(holder.address))}\` \\- \`${escapeMarkdownV2(formatPercentage(holder.percent))}\`${holder.tag ? ` \\(\`${escapeMarkdownV2(holder.tag)}\`\\)` : ''}\n`;
          });
        }
        message += '\n';

        // DEX Info Section (EVM)
        if (evmData.dex && evmData.dex.length > 0) {
          message += `*DEX Info*\n`;
          evmData.dex.forEach((dex) => {
            message += `${escapeMarkdownV2(dex.name)} \\(${escapeMarkdownV2(dex.liquidity_type)}\\): Liquidity $${escapeMarkdownV2(formatNumber(dex.liquidity))}\n`;
            message += `Pair: \`${escapeMarkdownV2(shortenAddress(dex.pair))}\`\n`;
          });
          // Ensure lp_holders exists and has elements before accessing
          const topLpPercent = evmData.lp_holders?.[0]?.percent
            ? parseFloat(evmData.lp_holders[0].percent)
            : 0;
          message += `Top LP Locked: ${escapeMarkdownV2(formatPercentage(topLpPercent))}\n\n`;
        }

        // Additional Notes (EVM)
        if (evmData.other_potential_risks) {
          message += `*Additional Risks*\n⚠️ ${escapeMarkdownV2(evmData.other_potential_risks)}\n\n`;
        }
      }

      // --- Footer ---
      message += `
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      ℹ️ _Data provided by GoPlus Security_
      ⚠️ _Always DYOR \\(Do Your Own Research\\) before trading\\!_`;
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '🔄 Refresh Report',
            `riskreport_${chain}_${address}`,
          ),
        ],
        [Markup.button.callback('❌ Close', 'close')],
      ]);

      await ctx.replyWithMarkdownV2(message, {
        reply_markup: keyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in risk report:', error);
      await ctx.reply(
        'Error fetching risk report data. Please try again later.',
      );
    }
  }

  @Action(/^rugpullreport_([a-z]+)_(.+)$/)
  async handleRugpullCheck(@Ctx() ctx) {
    try {
      ctx.answerCbQuery('Loading rug pull report...');
      const [, chain, address] = ctx.match;

      if (chain === 'sol') {
        ctx.reply('Rug pull check is not available for Solana tokens.');
        return;
      }

      const chainId = this.bubbleMapApiService.chainNames[chain].goPlusId;
      const response = await this.goPlusApiService.checkRugPull(
        chainId,
        address,
      );

      // Check if response contains data for the address
      if (!response || !response[address]) {
        await ctx.reply(
          `No rug pull analysis data available for this contract on ${this.bubbleMapApiService.chainNames[chain].name}.`,
        );
        return;
      }

      const report = response[address];

      let message = `*Rug Pull Check \\- ${escapeMarkdownV2(
        this.bubbleMapApiService.chainNames[chain].name,
      )}*`;
      message += `\n\n`;
      // Add header line about contract details
      message += `*Contract Details* 🔒\n\n`;

      // Basic contract info - Handle undefined or missing fields safely
      message += `Contract Name: ${report.contract_name || 'N/A'}\n`;

      // Check if owner properties exist
      const ownerType = report.owner?.owner_type || 'Unknown';
      message += `Owner Type: ${ownerType} ${ownerType === 'blackhole' ? '🔒' : ownerType === 'contract' ? '⚙️' : ownerType === 'eoa' ? '👤' : ''}\n`;

      // Security checks with emojis - use nullish coalescing for safety
      message += `\n*Security Checks* ⚡️\n`;
      message += `${report.is_open_source === '1' || report.is_open_source === 1 ? '✅' : '⚠️'} Source Code: ${report.is_open_source === '1' || report.is_open_source === 1 ? 'Verified' : 'Not Verified'}\n`;
      message += `${report.privilege_withdraw === '1' || report.privilege_withdraw === 1 ? '⚠️' : '✅'} Privileged Withdrawals: ${report.privilege_withdraw === '1' || report.privilege_withdraw === 1 ? 'Possible' : 'Not Detected'}\n`;
      message += `${report.withdraw_missing === '1' || report.withdraw_missing === 1 ? '⚠️' : '✅'} Withdrawal Function: ${report.withdraw_missing === '1' || report.withdraw_missing === 1 ? 'Missing' : 'Present'}\n`;

      // Only add these checks if the fields exist in the report
      if (report.blacklist !== undefined) {
        message += `${report.blacklist === '1' || report.blacklist === 1 ? '⚠️' : '✅'} Blacklist Function: ${report.blacklist === '1' || report.blacklist === 1 ? 'Present' : 'Not Found'}\n`;
      }

      if (report.selfdestruct !== undefined) {
        message += `${report.selfdestruct === '1' || report.selfdestruct === 1 ? '⚠️' : '✅'} Self\\-Destruct: ${report.selfdestruct === '1' || report.selfdestruct === 1 ? 'Present' : 'Not Found'}\n`;
      }

      if (report.approval_abuse !== undefined) {
        message += `${report.approval_abuse === '1' || report.approval_abuse === 1 ? '⚠️' : '✅'} Approval Abuse Risk: ${report.approval_abuse === '1' || report.approval_abuse === 1 ? 'Detected' : 'Not Detected'}\n`;
      }

      if (report.is_proxy !== undefined) {
        message += `${report.is_proxy === '1' || report.is_proxy === 1 ? '⚠️' : '✅'} Proxy Contract: ${report.is_proxy === '1' || report.is_proxy === 1 ? 'Yes' : 'No'}\n`;
      }

      message += `\n*Contract Address*\n\`${escapeMarkdownV2(shortenAddress(address))}\`\n\n`;
      message += `_Data provided by GoPlus Security_`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Close', 'close')],
      ]);

      await ctx.replyWithMarkdownV2(message, {
        reply_markup: keyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in rug pull check:', error);
      await ctx.reply('Error fetching rug pull data. Please try again later.');
    }
  }
  @Action(/^holders_([a-z]+)_(.+)_(\d+)?$/)
  async viewTokenHolders(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const [, chain, address, page] = ctx.match;
    ctx.answerCbQuery('Loading holders...');

    let holders: MapData['nodes'] = await this.cacheManager.get(
      `holders_${chain}_${address}`,
    );

    if (!holders) {
      const data = await this.bubbleMapApiService.fetchMapData(
        address,
        chain as Chain,
      );

      holders = data.nodes;

      // Store holders data in cache for 1 hour
      await this.cacheManager.set(
        `holders_${chain}_${address}`,
        holders,
        3600000, // Cache for 1 hour
      );
    }

    const PAGE_SIZE = 50;
    const pageNumber = page ? parseInt(page) : 0;

    let caption = `*Top ${holders.length} holders* \\(Page ${pageNumber + 1}\\):\n`;

    const start = pageNumber * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    const pageHolders = holders.slice(start, end);

    pageHolders.forEach((node, index) => {
      caption += `\n${start + index + 1}\\. ${escapeMarkdownV2(node.name || node.address)}:   \`${escapeMarkdownV2(formatPercentage(node.percentage))}\`   \\(\`${escapeMarkdownV2(
        formatNumber(node.amount),
      )}\`\\)`;
    });

    caption += `\n\nPage ${pageNumber + 1} of ${Math.ceil(
      holders.length / PAGE_SIZE,
    )}`;

    const buttons = [];
    const totalPages = Math.ceil(holders.length / PAGE_SIZE);

    // Add navigation buttons only if there are multiple pages
    if (totalPages > 1) {
      const navigationButtons = [];

      // Add Previous button if not on first page
      if (pageNumber > 0) {
        navigationButtons.push(
          Markup.button.callback(
            '◀️ Previous',
            `holders_${chain}_${address}_${pageNumber - 1}`,
          ),
        );
      }

      // Add Next button if not on last page
      if (pageNumber < totalPages - 1) {
        navigationButtons.push(
          Markup.button.callback(
            'Next ▶️',
            `holders_${chain}_${address}_${pageNumber + 1}`,
          ),
        );
      }

      if (navigationButtons.length > 0) {
        buttons.push(navigationButtons);
      }
    }

    // Always add Close button
    buttons.push([Markup.button.callback('❌ Close', 'close')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.replyWithMarkdownV2(caption, {
      reply_markup: keyboard.reply_markup,
      parse_mode: 'MarkdownV2',
    });
  }

  @Action('close')
  async onClose(@Ctx() ctx: Context) {
    ctx.answerCbQuery('Deleting...');
    await ctx.deleteMessage();
  }
}
