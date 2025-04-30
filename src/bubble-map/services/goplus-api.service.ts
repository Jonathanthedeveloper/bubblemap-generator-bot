import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  GoPlusApiResponse,
  RugPullAnalysis,
  SolanaTokenSecurityAndRiskData,
  TokenSecurityAndRiskData,
} from 'src/types';

@Injectable()
export class GoPlusApiService {
  private readonly apiBaseUrl = 'https://api.gopluslabs.io/api/v1';

  readonly supportedChains: Record<number | string, string> = {
    1: 'Ethereum',
    56: 'BSC',
    42161: 'Arbitrum',
    137: 'Polygon',
    324: 'zkSync Era',
    59144: 'Linea Mainnet',
    8453: 'Base',
    534352: 'Scroll',
    10: 'Optimism',
    43114: 'Avalanche',
    250: 'Fantom',
    25: 'Cronos',
    66: 'OKC',
    128: 'HECO',
    100: 'Gnosis',
    10001: 'ETHW',
    321: 'KCC',
    201022: 'FON',
    5000: 'Mantle',
    204: 'opBNB',
    42766: 'ZKFair',
    81457: 'Blast',
    169: 'Manta Pacific',
    80094: 'Berachain',
    2741: 'Abstract',
    177: 'Hashkey Chain',
    146: 'Sonic',
    1514: 'Story',
    tron: 'Tron',
  };

  constructor(private readonly httpService: HttpService) {}

  async getTokenSecurityAndRiskData(
    chainId: number | string,
    contractAddress: string,
  ) {
    if (!chainId || !contractAddress) {
      throw new Error('Chain ID and contract address are required');
    }

    // Check if the chain ID is supported
    if (!this.supportedChains[chainId]) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }

    const url = `${this.apiBaseUrl}/token_security/${chainId}?contract_addresses=${contractAddress}`;

    const response = await firstValueFrom(
      this.httpService.get<GoPlusApiResponse<TokenSecurityAndRiskData>>(url),
    );

    return response.data.result;
  }

  async getSolanaTokenSecurityAndRiskData(contractAddress: string) {
    if (!contractAddress) {
      throw new Error('Contract address is required');
    }

    const url = `${this.apiBaseUrl}/solana/token_security?contract_addresses=${contractAddress}`;

    const response = await firstValueFrom(
      this.httpService.get<GoPlusApiResponse<SolanaTokenSecurityAndRiskData>>(
        url,
      ),
    );

    return response.data.result;
  }

  async checkRugPull(chainId: number, contractAddress: string) {
    if (!chainId || !contractAddress) {
      throw new Error('Chain ID and contract address are required');
    }

    // Check if the chain ID is supported
    if (!this.supportedChains[chainId]) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }

    const url = `${this.apiBaseUrl}/rugpull_detecting/${chainId}?contract_addresses=${contractAddress}`;

    const response = await firstValueFrom(
      this.httpService.get<GoPlusApiResponse<RugPullAnalysis>>(url),
    );

    return response.data.result;
  }
}
