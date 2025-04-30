import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GeckoToken } from 'src/types';

@Injectable()
export class CoinGeckoService {
  private readonly apiBaseUrl = 'https://api.geckoterminal.com/api/v2';

  constructor(private readonly httpService: HttpService) {}

  async getTokenData(network: string, address: string) {
    if (!network || !address) {
      throw new Error('Network and address are required');
    }

    const url = `${this.apiBaseUrl}/networks/${network}/tokens/${address}`;

    const response = await firstValueFrom(
      this.httpService.get<{ data: GeckoToken }>(url, {
        headers: {
          Accept: 'application/json;version=20230302',
        },
      }),
    );

    return response.data.data;
  }
}
