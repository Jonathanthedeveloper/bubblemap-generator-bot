import { Inject, Injectable } from '@nestjs/common';
import { CanvasRendererService } from './canvas-renderer.service';
import {
  Chain,
  MapData,
  SolanaTokenSecurityAndRiskData,
  TokenSecurityAndRiskData,
} from 'src/types';
import { createCanvas } from 'canvas';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  escapeMarkdownV2,
  formatNumber,
  formatPercentage,
  formatUSD,
  progressBar,
} from 'src/utils';
import { BubbleMapApiService } from './bubble-map-api.service';
import { GoPlusApiService } from './goplus-api.service';
import { CoinGeckoService } from './coingecko.service';
import { Markup } from 'telegraf';

type BubbleMap = {
  width?: number;
  height?: number;
};

export const TOKEN_ADDRESS_REGEX =
  /^(?!\/)((0x[a-fA-F0-9]{40})|([1-9A-HJ-NP-Za-km-z]{32,44}))$/;

@Injectable()
export class BubbleMapService {
  constructor(
    private readonly bubblemapApiService: BubbleMapApiService,
    private readonly canvasRendererService: CanvasRendererService,
    private readonly goPlusApiService: GoPlusApiService,
    private readonly coingeckoService: CoinGeckoService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async handleBubbleMapRequest(
    ctx,
    data: {
      address: string;
      chain: Chain;
    },
    options?: {
      skipCache?: boolean;
      editMessage?: boolean;
    },
  ) {
    const { address, chain } = data;

    const isWatchlistItem = ctx.session.watchlist?.[`${chain}:${address}`];

    // Build reply keyboard
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          '👥 View Holders',
          `holders_${chain}_${address}_0`,
        ),
        Markup.button.url(
          '🔗 View on Bubble Maps',
          `https://app.bubblemaps.io/${chain}/token/${address}`,
        ),
      ],
      [
        Markup.button.callback(
          isWatchlistItem ? '➖ Remove From Watchlist' : '⭐ Add to Watchlist',
          isWatchlistItem
            ? `watchlist:remove_${chain}_${address}`
            : `watchlist:add_${chain}_${address}`,
        ),
        Markup.button.callback('🔄 Refresh', `refresh_${chain}_${address}`),
      ],
      [
        Markup.button.callback(
          '🔍 Full Risk Report',
          `riskreport_${chain}_${address}`,
        ),
        Markup.button.callback(
          '🔒 Rug Pull Check',
          `rugpullreport_${chain}_${address}`,
        ),
      ],
    ]);

    // Try to get from cache if not skipped
    if (!options?.skipCache) {
      const cacheData = await this.cacheManager.get<{
        caption: string;
        image: ArrayBufferLike;
      }>(address);

      if (cacheData) {
        await ctx.replyWithPhoto(
          { source: Buffer.from(cacheData.image) },
          {
            caption: cacheData.caption,
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard.reply_markup,
          },
        );
        return;
      }
    }
    try {
      // test chain against supported chains
      const isValidChain = Object.keys(
        this.bubblemapApiService.chainNames,
      ).includes(chain?.toLowerCase());

      if (!isValidChain) {
        const chainList = Object.entries(this.bubblemapApiService.chainNames)
          .map(([key, value]) => `• ${key}: ${value.name}`)
          .join('\n');

        await ctx.replyWithMarkdownV2(
          `*Unsupported chain*\n\n*Supported chains:*\n${chainList.replace(/[.]/g, '\\.')}\n\n*Example usage:*\n\`/map sol 0x1234567890123456789012345678901234567890\``,
        );
        return;
      }

      // test address against regex
      const isValidAddress = TOKEN_ADDRESS_REGEX.test(address);
      if (!isValidAddress) {
        await ctx.replyWithMarkdownV2(
          '*Invalid Address Format*\n\nPlease provide a valid address:\n• ETH/BSC: 0x followed by 40 hexadecimal characters\n• Solana: Base58 string \\(32\\-44 characters\\)\n\n*Example:*\n`/map eth 0x1234567890123456789012345678901234567890`',
        );
        return;
      }

      // Get the bubble map data
      const data = await this.getBubbleMapData(address, chain);

      // Cache the image and caption
      this.cacheManager.set(
        address,
        {
          image: data.image,
          caption: data.caption,
        },
        60000, // 1 minute cache time
      );

      if (options?.editMessage) {
        try {
          await ctx.editMessageCaption(data.caption, {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard.reply_markup,
          });
          return;
        } catch {}
      }

      await ctx.replyWithPhoto(
        { source: Buffer.from(data.image) },
        {
          caption: data.caption,
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard.reply_markup,
        },
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      await ctx.reply(
        error.message ||
          'An error occurred while fetching the data. Please try again later.',
      );
    }
  }

  async getBubbleMapData(address: string, chain: Chain = 'eth') {
    if (!address || !chain) throw new Error('Address and chain are required');

    const normalizedChain = chain.toLowerCase().trim() as Chain;

    let goPlusApi: Promise<
      SolanaTokenSecurityAndRiskData | TokenSecurityAndRiskData
    >;

    try {
      // Get token security and risk data from GoPlus API
      if (chain === 'sol') {
        goPlusApi =
          this.goPlusApiService.getSolanaTokenSecurityAndRiskData(address);
      } else {
        goPlusApi = this.goPlusApiService.getTokenSecurityAndRiskData(
          this.bubblemapApiService.chainNames[normalizedChain].goPlusId,
          address,
        );
      }

      const data = await this.bubblemapApiService.fetchMapData(
        address,
        normalizedChain,
      );

      if (!data) {
        throw new Error(
          'No data found for this address. Please try again later.',
        );
      }

      const [metadataResult, goplusDataResult, tokenInfoResult] =
        await Promise.allSettled([
          this.bubblemapApiService.fetchMetadata(address, normalizedChain),
          goPlusApi,
          this.coingeckoService.getTokenData(
            this.bubblemapApiService.chainNames[normalizedChain]
              .geckoTerminalId,
            address,
          ),
        ]);

      // Extract values or use defaults for optional data
      const metadata =
        metadataResult.status === 'fulfilled' ? metadataResult.value : null;
      const goplusData =
        goplusDataResult.status === 'fulfilled'
          ? goplusDataResult.value?.[address]
          : null;
      const tokenInfo =
        tokenInfoResult.status === 'fulfilled' ? tokenInfoResult.value : null;

      if (!data) {
        throw new Error(
          'No data found for this address. Please try again later.',
        );
      }

      if (metadata.status !== 'OK') return;

      const captions = [];

      // Basic Info
      captions.push(
        `*🪙 ${escapeMarkdownV2(data.full_name)} \\(${escapeMarkdownV2(data.symbol)}\\)*`,
      );
      captions.push(
        `\`${escapeMarkdownV2(this.bubblemapApiService.chainNames[data.chain].name)} Blockchain\``,
      );
      captions.push(`\`${escapeMarkdownV2(data.token_address)}\``);
      captions.push('\n━━━━━━━━━━━━━━━━━━');

      // Market Data (Placeholders or fetch from another source if needed)
      captions.push('*📊 Market Data*');
      captions.push('━━━━━━━━━━━━━━━━━━');
      if (tokenInfo?.attributes) {
        captions.push(
          `💰 *Price:* ${tokenInfo.attributes.price_usd ? escapeMarkdownV2(formatUSD(tokenInfo.attributes.price_usd.toString())) : 'N/A'}`,
        );
        captions.push(
          `📈 *Market Cap:* ${tokenInfo.attributes.market_cap_usd ? escapeMarkdownV2(formatUSD(tokenInfo.attributes.market_cap_usd.toString())) : 'N/A'}`,
        );
      }

      if (goplusData) {
        if (chain === 'sol') {
          const solData = goplusData as SolanaTokenSecurityAndRiskData[string];
          const dexInfo = solData.dex?.[0]; // Assuming first DEX is relevant
          if (dexInfo?.tvl)
            captions.push(
              `💧 Liquidity: $${escapeMarkdownV2(formatNumber(parseFloat(dexInfo.tvl)))}`,
            );
          if (solData.total_supply)
            captions.push(
              ` Supply: ${escapeMarkdownV2(formatNumber(parseFloat(solData.total_supply)))}`,
            );
        } else {
          const evmData = goplusData as TokenSecurityAndRiskData[string];
          const dexInfo = evmData.dex?.[0]; // Assuming first DEX is relevant
          if (dexInfo?.liquidity)
            captions.push(
              `💧 Liquidity: $${escapeMarkdownV2(formatNumber(parseFloat(dexInfo.liquidity)))}`,
            );
          if (evmData.total_supply)
            captions.push(
              `📦 Supply: ${escapeMarkdownV2(formatNumber(parseFloat(evmData.total_supply)))}`,
            );
        }
      }
      if (tokenInfo?.attributes?.fdv_usd) {
        captions.push(
          `🚀 *FDV:* ${escapeMarkdownV2(formatUSD(tokenInfo.attributes.fdv_usd))}`,
        );
      }

      // Bubblemaps Insights
      captions.push('\n━━━━━━━━━━━━━━━━━━');
      captions.push('*🔍 Bubblemaps Insights*');
      captions.push('━━━━━━━━━━━━━━━━━━');
      if (metadata.decentralisation_score !== undefined) {
        const scoreExplanation =
          metadata.decentralisation_score > 75
            ? '(Highly decentralized)'
            : metadata.decentralisation_score > 50
              ? '(Moderately decentralized)'
              : '(Centralized)';

        captions.push(
          `Decentralization:  ${progressBar(metadata.decentralisation_score, 0, 10)}  ${escapeMarkdownV2(metadata.decentralisation_score.toString())}/100 ${escapeMarkdownV2(scoreExplanation)}`,
        );
      }
      if (goplusData?.holder_count) {
        captions.push(
          `👥 Holders: \`${escapeMarkdownV2(formatNumber(parseInt(goplusData.holder_count)))}\``,
        );
      }
      // Concentration calculation would require iterating through goplusData.holders
      // captions.push(`Concentration: Top 10 Hold \`X%\``); // Placeholder for now

      const concentration = goplusData?.holders?.reduce((acc, holder) => {
        if (parseFloat(holder.percent) > 0) {
          acc += parseFloat(holder.percent);
        }
        return acc;
      }, 0);

      if (concentration) {
        captions.push(
          `🎯 Top 10 Holders: \`${escapeMarkdownV2(concentration.toFixed(2).toString())}%\``,
        );
      }

      if (metadata.identified_supply) {
        captions.push(
          `Identified Supply \\(CEX\\): ${escapeMarkdownV2(
            formatPercentage(metadata.identified_supply?.percent_in_cexs),
          )}`,
        );
        captions.push(
          `Identified Supply \\(Contracts\\): ${escapeMarkdownV2(
            formatPercentage(metadata.identified_supply?.percent_in_contracts),
          )}`,
        );
      }
      captions.push('\n━━━━━━━━━━━━━━━━━━');

      // Security Flags
      captions.push('*🛡️ Security Flags*');
      captions.push('━━━━━━━━━━━━━━━━━━');
      if (goplusData) {
        if (chain === 'sol') {
          const solData = goplusData as SolanaTokenSecurityAndRiskData[string];
          // Solana specific checks (less direct mapping than EVM)
          captions.push(
            solData.metadata_mutable?.status === '1'
              ? '⚠️ Metadata Mutable'
              : '✅ Metadata Immutable',
          );
          captions.push(
            solData.mintable?.status === '1'
              ? '⚠️ Mintable'
              : '✅ Minting Disabled',
          );
          captions.push(
            solData.freezable?.status === '1'
              ? '⚠️ Freezable'
              : '✅ Non\\-Freezable',
          );
          captions.push(
            solData.closable?.status === '1'
              ? '⚠️ Closable'
              : '✅ Non\\-Closable',
          );
          captions.push(
            solData.transfer_hook.length
              ? '⚠️ Has Transfer Hooks'
              : '✅ No Transfer Hooks',
          );
        } else {
          const evmData = goplusData as TokenSecurityAndRiskData[string];
          // EVM specific checks
          captions.push(
            evmData.is_open_source === '1'
              ? '✅ *Contract Verified*'
              : '❌ *Contract Unverified*',
          );
          captions.push(
            evmData.owner_address ===
              '0x0000000000000000000000000000000000000000' ||
              evmData.owner_address === ''
              ? '✅ Ownership Renounced'
              : evmData.can_take_back_ownership === '1'
                ? '🚨 Can Retake Ownership'
                : '⚠️ Ownership Not Renounced',
          );
          const buyTax = parseFloat(evmData.buy_tax || '0') * 100;
          const sellTax = parseFloat(evmData.sell_tax || '0') * 100;
          if (buyTax <= 5 && sellTax <= 5) {
            captions.push(
              `✅ *Low Tax:* Buy ${escapeMarkdownV2(buyTax.toFixed(1))}%, Sell ${escapeMarkdownV2(sellTax.toFixed(1))}%`,
            );
          } else {
            captions.push(
              `⚠️ *High Tax:* Buy ${escapeMarkdownV2(buyTax.toFixed(1))}%, Sell ${escapeMarkdownV2(sellTax.toFixed(1))}%`,
            );
          }

          captions.push(
            evmData.is_honeypot === '1'
              ? '🚨 Honeypot Detected\\!'
              : '✅ No Honeypot',
          );

          const otherFlags = [];
          if (evmData.is_mintable === '1') otherFlags.push('Mintable');
          if (evmData.is_proxy === '1') otherFlags.push('Proxy');
          if (evmData.selfdestruct === '1') otherFlags.push('Selfdestruct');
          if (evmData.transfer_pausable === '1') otherFlags.push('Pausable');
          if (evmData.is_blacklisted === '1') otherFlags.push('Blacklist');
          if (evmData.is_whitelisted === '1') otherFlags.push('Whitelist');
          if (otherFlags.length > 0) {
            captions.push(
              `⚠️ Other Flags: \`${escapeMarkdownV2(otherFlags.join(', '))}\``,
            );
          }
        }
      } else {
        captions.push('Could not retrieve security data\\.');
      }

      // Process the data and generate the bubble map
      const buffer = await this.generateBubbleMapImage(data);
      const caption = captions.join('\n');

      // Send the image to the user
      return {
        image: buffer,
        caption,
      };
    } catch (error) {
      throw error;
    }
  }

  async generateBubbleMapImage(
    data: MapData,
    options: BubbleMap = {},
  ): Promise<Buffer<ArrayBufferLike>> {
    // Configure dimention
    const width = options.width ?? 1000;
    const height = options.height ?? 1000;

    const center = {
      x: width / 2,
      y: height / 2,
    };

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Canvas rendering information
    ctx.imageSmoothingEnabled = true;
    ctx.patternQuality = 'best';
    ctx.quality = 'best';
    ctx.antialias = 'gray';

    // Normalise data
    const totalSupply = data.nodes.reduce((sum, node) => sum + node.amount, 0);
    const nodes = data.nodes.map((node, index) => {
      const percentage = (node.amount / totalSupply) * 100;

      return {
        id: index,
        ...node,
        percentage,
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.max(Math.sqrt(percentage) * 25, 3),
      };
    });

    const links = [...data.links];

    // Import D3
    const d3 = (await new Function(
      "return import('d3-force')",
    )()) as typeof import('d3-force');

    // Create Simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-50).distanceMax(250))
      .force('center', d3.forceCenter(width / 2, center.y).strength(0.03))
      .force(
        'radial',
        d3
          .forceRadial(
            (d: any) => {
              // Radial positioning based on node importance (percentage)
              return (1 - Math.sqrt(d.percentage / 100)) * 400;
            },
            center.x,
            center.y,
          )
          .strength(0.005),
      )
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(50)
          .strength(0.5),
      );

    let alpha = simulation.alpha();
    const alphaMin = 0.001; // Minimum alpha value for stability
    const alphaDecay = 0.02; // Decay rate
    const maxIterations = 500; // Maximum iterations
    let iterations = 0;

    while (alpha > alphaMin && iterations < maxIterations) {
      simulation.tick();
      alpha *= 1 - alphaDecay;
      iterations++;
    }

    const [minX, maxX] = nodes.reduce(
      ([min, max], n) => [Math.min(min, n.x), Math.max(max, n.x)],
      [Infinity, -Infinity],
    );
    const [minY, maxY] = nodes.reduce(
      ([min, max], n) => [Math.min(min, n.y), Math.max(max, n.y)],
      [Infinity, -Infinity],
    );

    const margin = 50;

    const scale = Math.min(
      (width - 2 * margin) / (maxX - minX),
      (height - 2 * margin) / (maxY - minY),
    );

    const scaleX = scale;
    const scaleY = scale;
    const offsetX = (width - (maxX - minX) * scaleX) / 2 - minX * scaleX;
    const offsetY = (height - (maxY - minY) * scaleY) / 2 - minY * scaleY;

    // Adjust node positions.
    nodes.forEach((node) => {
      node.x = node.x * scaleX + offsetX;
      node.y = node.y * scaleY + offsetY;
    });

    // Identify connected components (clusters)
    const clusters = this.getConnectedComponents(nodes, links);

    // Assign unique colors to each cluster
    const clusterColors = clusters.map((cluster, index) => {
      const hue = (index * 137) % 360; // Precomputed hue
      return cluster.length === 1
        ? { fill: 'hsla(265, 45%, 31%,0.4)', stroke: 'hsla(265, 45%, 31%,1)' }
        : {
            fill: `hsla(${hue}, 70%, 50%, 0.4)`,
            stroke: `hsla(${hue}, 70%, 50%, 1)`,
          };
    });

    ctx.fillStyle = '0e001f';
    ctx.fillRect(0, 0, width, height);

    // Draw nodes with cluster colors
    clusters.forEach((cluster, clusterIndex) => {
      const color = clusterColors[clusterIndex];
      cluster.forEach((nodeId) => {
        const node = nodes[nodeId];
        this.canvasRendererService.drawCircle(ctx, {
          x: node.x,
          y: node.y,
          radius: node.radius,
          fill: color.fill,
          stroke: color.stroke,
        });
      });
    });

    // Draw Lines
    links.forEach((link) => {
      const source = link.source as any;
      const target = link.target as any;

      const direction =
        link.backward && link.forward
          ? 'bidirectional'
          : link.forward
            ? 'forward'
            : 'backward';

      if (source && target) {
        this.canvasRendererService.drawLine(ctx, {
          color: 'rgba(255,255,255,1)',
          startX: source.x,
          startY: source.y,
          endX: target.x,
          endY: target.y,
          direction,
        });
      }
    });

    const image = canvas.toBuffer('image/jpeg', {
      quality: 1,
    });

    return image;
  }

  private getConnectedComponents(nodes, links) {
    const parent = new Map();
    const find = (x) => {
      let root = x;
      while (parent.get(root) !== root) {
        root = parent.get(root);
      }
      // Path compression
      let current = x;
      while (current !== root) {
        const next = parent.get(current);
        parent.set(current, root);
        current = next;
      }
      return root;
    };
    const union = (x, y) => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) parent.set(rootX, rootY);
    };

    nodes.forEach((node) => parent.set(node.id, node.id));
    links.forEach((link) => union(link.source.id, link.target.id));

    const clusters = new Map();
    nodes.forEach((node) => {
      const root = find(node.id);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(node.id);
    });

    return Array.from(clusters.values());
  }
}
