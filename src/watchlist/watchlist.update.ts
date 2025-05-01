import { Action, Command, Ctx, Update } from 'nestjs-telegraf';
import { BubbleMapApiService } from 'src/bubble-map/services/bubble-map-api.service';
import { CoinGeckoService } from 'src/bubble-map/services/coingecko.service';
import { Markup } from 'telegraf';

interface WatchlistItem {
  chain: string;
  address: string;
  name: string;
}

const ITEMS_PER_PAGE = 8;

@Update()
export class WatchlistUpdate {
  constructor(
    private readonly bubbleMapApiService: BubbleMapApiService,
    private readonly coingeckoService: CoinGeckoService,
  ) {}

  @Command('watchlist')
  async watchlist(@Ctx() ctx, page = 0) {
    try {
      if (!ctx.session.watchlist) {
        ctx.session.watchlist = {};
      }

      const watchlistItems = Object.values(
        ctx.session.watchlist || {},
      ) as WatchlistItem[];

      if (watchlistItems.length === 0) {
        await ctx.reply('Your watchlist is empty');
        return;
      }

      // Calculate pagination values
      const totalPages = Math.ceil(watchlistItems.length / ITEMS_PER_PAGE);
      const currentPage = Math.max(0, Math.min(page, totalPages - 1)); // Ensure page is in valid range

      // Get items for current page
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = Math.min(
        startIndex + ITEMS_PER_PAGE,
        watchlistItems.length,
      );
      const pageItems = watchlistItems.slice(startIndex, endIndex);

      // Create token buttons - 2 per row
      const buttonRows = pageItems.reduce<Array<Array<any>>>(
        (rows, item, index) => {
          const row = Math.floor(index / 2);

          if (!rows[row]) {
            rows[row] = [];
          }

          rows[row].push(
            Markup.button.callback(
              `${item.name} (${item.chain.toUpperCase()})`,
              `map_${item.chain}_${item.address}`,
            ),
          );

          return rows;
        },
        [],
      );

      // Add pagination navigation row if needed
      if (totalPages > 1) {
        const navRow = [];

        // Previous button (if not on first page)
        if (currentPage > 0) {
          navRow.push(
            Markup.button.callback(
              '◀️ Previous',
              `watchlist:page_${currentPage - 1}`,
            ),
          );
        }

        // Page indicator
        navRow.push(
          Markup.button.callback(
            `${currentPage + 1}/${totalPages}`,
            'watchlist:noop',
          ),
        );

        // Next button (if not on last page)
        if (currentPage < totalPages - 1) {
          navRow.push(
            Markup.button.callback(
              'Next ▶️',
              `watchlist:page_${currentPage + 1}`,
            ),
          );
        }

        buttonRows.push(navRow);
      }

      const keyboard = Markup.inlineKeyboard(buttonRows);

      const message = `*Your Watchlist* \\(${watchlistItems.length} token${watchlistItems.length !== 1 ? 's' : ''}\\)`;

      await ctx.replyWithMarkdownV2(message, {
        reply_markup: keyboard.reply_markup,
      });
    } catch (error) {
      await ctx.reply(
        error.message || 'An error occurred while fetching your watchlist.',
      );
    }
  }

  @Action('watchlist:noop')
  async handleNoOp(@Ctx() ctx) {
    await ctx.answerCbQuery('Current page');
  }

  @Action(/^watchlist:page_(\d+)$/)
  async changePage(@Ctx() ctx) {
    const [, pageStr] = ctx.match;
    const page = parseInt(pageStr, 10);

    // Answer callback query to remove loading state
    await ctx.answerCbQuery();

    // Delete original message
    await ctx.deleteMessage();

    // Show watchlist with new page
    await this.watchlist(ctx, page);
  }

  @Action(/^watchlist:add_([a-z]+)_(.+)$/)
  async addToWatchlist(@Ctx() ctx) {
    try {
      ctx.answerCbQuery('Adding Token to watchlist');
      const [, chain, address] = ctx.match;
      const key = `${chain}:${address}`;

      if (!ctx.session.watchlist) {
        ctx.session.watchlist = {};
      }
      const data = await this.coingeckoService.getTokenData(
        this.bubbleMapApiService.chainNames[chain].geckoTerminalId,
        address,
      );

      ctx.session.watchlist[key] = {
        chain,
        address,
        name: data.attributes.name,
        symbol: data.attributes.symbol,
      };

      await ctx.replyWithMarkdownV2(
        `✅ Added \`${address}\` on \`${this.bubbleMapApiService.chainNames[chain].name}\` to your watchlist`,
      );
    } catch (error) {
      ctx.reply(
        error.message || 'An error occurred while adding to watchlist.',
      );
    }
  }

  @Action(/^watchlist:remove_([a-z]+)_(.+)$/)
  async removeFromWatchlist(@Ctx() ctx) {
    try {
      ctx.answerCbQuery('Removing Token from watchlist');
      const [, chain, address] = ctx.match;

      const key = `${chain}:${address}`;

      if (!ctx.session.watchlist) {
        await ctx.reply('Your watchlist is empty');
        return;
      }

      delete ctx.session.watchlist[key];

      await ctx.replyWithMarkdownV2(
        `🗑️ Removed \`${address}\` on \`${this.bubbleMapApiService.chainNames[chain].name}\` from your watchlist`,
      );
    } catch (error) {
      ctx.reply(
        error.message || 'An error occurred while removing from watchlist.',
      );
    }
  }
}
