/*
 * PolkADAPT
 *
 * Copyright 2020 Stichting Polkascan (Polkascan Foundation)
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

import { ApiPromise, WsProvider } from '@polkadot/api';
import { AdapterBase } from '@polkadapt/core';
import { ApiOptions } from '@polkadot/api/types';

export type Api = ApiPromise;

export interface Config {
  chain: string;
  providerURL: string;
  apiOptions?: ApiOptions;
}

export class Adapter extends AdapterBase {
  name = 'substrate-rpc';
  promise: Promise<ApiPromise>;
  config: Config;

  constructor(config: Config) {
    super(config.chain);
    this.config = config;
  }

  connect(): void {
    if (!this.promise) {
      // No apiPromise-promise initialised, create it
      this.promise = this.createPromise();
    }
  }

  disconnect(): void {
    if (this.promise) {
      this.promise.then((apiPromise) => {
        if (apiPromise.isConnected) {
          apiPromise.disconnect();
          this.promise = undefined;
        }
      });
    }
  }

  get isReady(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      if (this.promise) {
        const apiPromise = await this.promise;
        try {
          await apiPromise.isReadyOrError;
          resolve(true);
        } catch (e) {
          throw new Error(e);
        }
      } else {
        throw new Error('[SubstrateRPCAdapter] Could not check readiness, no apiPromise available');
      }
    });
  }

  private async createPromise(): Promise<ApiPromise> {
    const wsProvider = new WsProvider(this.config.providerURL);
    try {
      const apiOptions: ApiOptions = {provider: wsProvider};
      if (this.config.apiOptions) {
        // Provider can be overwritten by the given apiOptions.
        Object.assign(apiOptions, this.config.apiOptions);
      }
      return ApiPromise.create(apiOptions);
    } catch (e) {
      console.error('[SubstrateRPCAdapter] Could not create apiPromise', e);
      throw new Error(e);
    }
  }
}
