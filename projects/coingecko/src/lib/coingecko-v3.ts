/*
 * PolkADAPT
 *
 * Copyright 2020-2023 Polkascan Foundation (NL)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AdapterBase } from '@polkadapt/core';
import { fromFetch } from 'rxjs/internal/observable/dom/fetch';
import { map, Observable, switchMap } from 'rxjs';

export type Api = {
  prices: {
    getPrice: (currency: string) =>
      Observable<number>;
    getHistoricalPrice: (day: number, month: number, year: number, currency: string) =>
      Observable<number>;
    getHistoricalPricesRange: (from: number, to: number, currency: string) =>
      Observable<[number, number][]>;
    getHistoricalPrices: (currency: string, days: number | 'max') =>
      Observable<[number, number][]>;
  };
};

export type Config = {
  chain: string;
  apiEndpoint: string;
  coinId: string;
};

type CoinGeckoSimpleResponse = { [coinId: string]: { [currency: string]: number } };
// eslint-disable-next-line @typescript-eslint/naming-convention
type CoinGeckoHistoryResponse = { market_data: { current_price: { [currency: string]: number } } };
type CoinGeckoPriceRangeResponse = { prices: [number, number][]};
type CoinGeckoMarketChartResponse = {
  prices: [number, number][];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  market_caps: [number, number][];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  totals_volume: [number, number][];
};

export class Adapter extends AdapterBase {
  name = 'coingecko';
  config: Config;
  pingTimeout: number | null = null;
  api: Api = {
    prices: {
      getPrice: currency =>
        this.request<CoinGeckoSimpleResponse>(
          `simple/price?ids=${this.config.coinId}&vs_currencies=${currency}`
        ).pipe(
          map(result => result[this.config.coinId][currency.toLocaleLowerCase()])
        ),
      getHistoricalPrice: (day, month, year, currency: string) =>
        this.request<CoinGeckoHistoryResponse>(
          `coins/${this.config.coinId}/history?date=${day}-${month}-${year}&localization=false`
        ).pipe(
          map(result => result.market_data.current_price[currency.toLowerCase()])
        ),
      getHistoricalPricesRange: (from, to, currency) =>
        this.request<CoinGeckoPriceRangeResponse>(
          `coins/${this.config.coinId}/market_chart/range?vs_currency=${currency}&from=${from}&to=${to}`
        ).pipe(
          map(result => result.prices)
        ),
      getHistoricalPrices: (currency: string, days: number | 'max') =>
        this.request<CoinGeckoMarketChartResponse>(
          `coins/${this.config.coinId}/market_chart?vs_currency=${currency}&days=${days}&interval=daily`
        ).pipe(
          map(result => {
            const prices = result && result.prices;
            if (prices && Array.isArray(prices)) {
              const lastItem = prices[prices.length - 1];
              if (lastItem) {
                const date = new Date(lastItem[0]);
                const startOfUTCDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
                if (+date !== +startOfUTCDay) {
                  prices.pop();
                }
              }
              if (prices.length > 0) {
                return prices;
              }
            }
            return [];
          })
        )
    }
  };

  constructor(config: Config) {
    super(config.chain);
    this.config = config;
  }

  private request<T>(path: string): Observable<T> {
    const url = `${this.config.apiEndpoint}${this.config.apiEndpoint.endsWith('/') ? '' : '/'}${path}`;
    return fromFetch(url).pipe(
      switchMap(response => {
        if (response.ok) {
          return response.json() as Promise<T>;
        } else {
          throw new Error('CoinGecko request failed.');
        }
      })
    );
  }
}
