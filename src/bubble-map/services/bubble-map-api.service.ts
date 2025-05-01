import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Chain, MapData, MapMetadata } from 'src/types';

@Injectable()
export class BubbleMapApiService {
  private readonly apiBaseUrl = 'https://api-legacy.bubblemaps.io';

  constructor(private readonly httpService: HttpService) {}

  readonly chainNames: Record<
    Chain,
    {
      name: string;
      goPlusId: number | string;
      geckoTerminalId?: string;
      isEvm: boolean;
    }
  > = {
    eth: {
      name: 'Ethereum',
      goPlusId: 1,
      geckoTerminalId: 'eth',
      isEvm: true,
    },
    bsc: {
      name: 'Binance Smart Chain',
      goPlusId: 56,
      geckoTerminalId: 'bsc',
      isEvm: true,
    },
    ftm: {
      name: 'Fantom',
      goPlusId: 250,
      geckoTerminalId: 'ftm',
      isEvm: true,
    },
    avax: {
      name: 'Avalanche',
      goPlusId: 43114,
      geckoTerminalId: 'avax',
      isEvm: true,
    },
    cro: {
      name: 'Cronos',
      goPlusId: 25,
      geckoTerminalId: 'cro',
      isEvm: true,
    },
    arbi: {
      name: 'Arbitrum',
      goPlusId: 42161,
      geckoTerminalId: 'arbitrum',
      isEvm: true,
    },
    poly: {
      name: 'Polygon',
      goPlusId: 137,
      geckoTerminalId: 'polygon_pos',
      isEvm: true,
    },
    base: {
      name: 'Base',
      goPlusId: 8453,
      geckoTerminalId: 'base',
      isEvm: true,
    },
    sol: {
      name: 'Solana',
      goPlusId: 'solana',
      geckoTerminalId: 'solana',
      isEvm: false,
    },
    sonic: {
      name: 'Sonic',
      goPlusId: 146,
      geckoTerminalId: 'sonic',
      isEvm: true,
    },
  };

  async fetchMapData(token: string, chain: Chain = 'eth') {
    if (!token || !chain) {
      throw new Error('Token and chain are required');
    }

    const url = `${this.apiBaseUrl}/map-data/?token=${token}&chain=${chain}`;

    try {
      const response = await firstValueFrom(this.httpService.get<MapData>(url));

      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Error fetching map data',
      );
    }
  }

  async fetchMetadata(token: string, chain: Chain = 'eth') {
    const url = `${this.apiBaseUrl}/map-metadata?token=${token}&chain=${chain}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<MapMetadata>(url),
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Error fetching metadata',
      );
    }
  }
}
