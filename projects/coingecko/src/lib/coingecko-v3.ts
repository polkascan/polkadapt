import { AdapterBase } from '@polkadapt/core';

export type Api = {
  prices: {
    getPrice: (currency: string) =>
      Promise<number>;
    getHistoricalPrice: (day: number, month: number, year: number, currency: string) =>
      Promise<number>;
  }
};

export type Config = {
  chain: string;
  apiEndpoint: string;
}

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
            try {
              const price = await this.request(`simple/price?ids=${this.config.chain}&vs_currencies=${currency}`);
              return price[this.config.chain][currency.toLocaleLowerCase()];
            } catch (e) {
              console.error('CoinGecko v3 adapter', e);
              return undefined;
            }
          },
          getHistoricalPrice: async (day, month, year, currency: string) => {
            // Date format is dd-mm-yyyy.
            try {
              const price = await this.request(`coins/${this.config.chain}/history?date=${day}-${month}-${year}&localization=false`);
              return price.market_data.current_price[currency.toLocaleLowerCase()];
            } catch (e) {
              console.error('CoinGecko v3 adapter', e);
              return undefined;
            }
          }
        }
      });
    });
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
      }

      ping(0);
    })
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


  get isReady(): Promise<boolean> {
    return this.readyPromise || Promise.reject();
  }


  request(path: string): Promise<any> {
    const request = new XMLHttpRequest();
    const url = `${this.config.apiEndpoint}${this.config.apiEndpoint.endsWith('/') ? '' : '/'}${path}`;

    const promise = new Promise<any>((resolve, reject) => {

      this.activeRequests.push(request);
      request.open('GET', url);
      request.send();

      request.onreadystatechange = (e) => {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status === 200) {
            try {
              resolve(JSON.parse(request.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            console.error('[CoinGecko v3 adapter] A request error occurred.', request.response);
            reject('[CoinGecko v3 adapter] A request error occurred.');
          }
        }
      }
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