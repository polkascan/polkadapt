/*
 * PolkADAPT
 *
 * Copyright 2020-2022 Polkascan Foundation (NL)
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

export type Api = {
  prices: {
    getPrice: (currency: string) =>
      Promise<number | undefined>;
    getHistoricalPrice: (day: number, month: number, year: number, currency: string) =>
      Promise<number | undefined>;
  };
};

export type Config = {
  chain: string;
  apiEndpoint: string;
};

type CoinGeckoSimpleResponse = { [chain: string]: { [currency: string]: number } };
// eslint-disable-next-line @typescript-eslint/naming-convention
type CoinGeckoHistoryResponse = { market_data: { current_price: { [currency: string]: number } } };

export class Adapter extends AdapterBase {
  name = 'coingecko';
  promise: Promise<Api> | undefined;
  api: Api | undefined;
  config: Config;
  readyPromise: Promise<boolean> | null = null;
  pingTimeout: number | null = null;
  activeRequests: XMLHttpRequest[] = [];

  constructor(config: Config) {
    super(config.chain);
    this.config = config;

    this.promise = new Promise((resolve) => {
      resolve({
        prices: {
          getPrice: async (currency: string) => {
            let response: CoinGeckoSimpleResponse;
            try {
              response = await this.request(
                `simple/price?ids=${this.config.chain}&vs_currencies=${currency}`
              ) as CoinGeckoSimpleResponse;
            } catch (e) {
              console.error('[CoinGecko v3 adapter] Could not fetch price information.', e);
              return undefined;
            }

            if (response && response[this.config.chain]) {
              return response[this.config.chain][currency.toLocaleLowerCase()];
            }
            return undefined;
          },
          getHistoricalPrice: async (day, month, year, currency: string) => {
            // Date format is dd-mm-yyyy.
            let response: CoinGeckoHistoryResponse;
            try {
              response = await this.request(
                `coins/${this.config.chain}/history?date=${day}-${month}-${year}&localization=false`
              ) as CoinGeckoHistoryResponse;
            } catch (e) {
              console.error('[CoinGecko v3 adapter] Could not fetch historic price information.', e);
              return undefined;
            }
            if (response && response.market_data && response.market_data.current_price) {
              return response.market_data.current_price[currency.toLowerCase()];
            }
            return undefined;
          }
        }
      });
    });
  }


  get isReady(): Promise<boolean> {
    return this.readyPromise || Promise.reject();
  }


  connect(): void {
    this.readyPromise = new Promise<boolean>((resolve, reject) => {
      const ping = (n: number) => {
        this.request('ping').then(
          () => {
            this.pingTimeout = null;
            resolve(true);
          },
          () => {
            if (n < 10) {
              this.pingTimeout = window.setTimeout(() => {
                ping(n + 1);
              }, 1000);
            } else {
              this.pingTimeout = null;
              reject('[CoinGecko v3 adapter] Could not connect.');
            }
          });
      };

      ping(0);
    });
  }


  disconnect(): void {
    this.readyPromise = null;

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }

    for (const request of this.activeRequests) {
      request.abort();
    }
    this.activeRequests = [];
  }


  request(path: string): Promise<any> {
    const request = new XMLHttpRequest();
    const url = `${this.config.apiEndpoint}${this.config.apiEndpoint.endsWith('/') ? '' : '/'}${path}`;

    const promise = new Promise<any>((resolve, reject) => {

      this.activeRequests.push(request);
      request.open('GET', url);
      request.send();

      request.onreadystatechange = () => {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status === 200) {
            try {
              resolve(JSON.parse(request.responseText));
            } catch (err) {
              console.error('[CoinGecko v3 adapter] Could not parse response.', err);
              reject(err);
            }
          } else {
            console.error('[CoinGecko v3 adapter] A request error occurred.', request.response);
            reject('[CoinGecko v3 adapter] A request error occurred.');
          }
        }
      };
    });

    promise.finally(() => {
      const index = this.activeRequests.indexOf(request);
      if (index >= 0) {
        this.activeRequests.splice(index, 1);
      }
    });

    return promise;
  }
}
