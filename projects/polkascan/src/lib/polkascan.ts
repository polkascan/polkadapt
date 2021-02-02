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

import { AdapterBase } from '@polkadapt/core';
import { PolkascanApi } from './polkascan.api';
import { GQLMSG, PolkascanWebSocket } from './polkascan.web-socket';

export type Api = {
  query: {
    council: {
      getVotes: (address: string) => Promise<any>
    },
    system: {
      account: (address: string) => Promise<any>
    },
    block: {
      all: () => Promise<any>
    }
  }
  // rpc: {
  //   chain: {
  //     subscribeNewHeads: (callback: (value: any) => void) => Promise<any>
  //   }
  // }
};

export interface Config {
  chain: string;
  apiEndpoint: string;
  wsEndpoint: string;
}

export class Adapter extends AdapterBase {
  name = 'polkascan';
  promise: Promise<Api>;
  socket: PolkascanWebSocket;
  api: PolkascanApi;
  config: Config;

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  constructor(config: Config) {
    super(config.chain);
    this.config = config;

    this.api = new PolkascanApi(this.config.apiEndpoint);
    this.socket = new PolkascanWebSocket(this.config.wsEndpoint, config.chain);

    this.promise = new Promise((resolve) => {
      resolve({
        query: {
          council: {
            getVotes: async (address: string) => this.api.getMemberVotes(address)
          },
          system: {
            account: async (address: string) => this.api.getAccount(address)
          },
          block: {
            all: () => {
              if (this.socket && this.socket.isReady) {
                return new Promise((res, rej) => {
                  const id = 'q1';
                  const payload = {
                    type: GQLMSG.START,
                    id,
                    payload: {
                      query: 'query allBlockies { allBlocks { id, hash } }',
                      operationName: null,
                    },
                  };

                  const timeout = setTimeout(() => {
                    rej('websocket answer took to long');
                  }, 3000);

                  const listenerFn = (message: any) => {
                    if (message.id === id) {
                      clearTimeout(timeout);
                      if (message.data && message.data.allBlocks) {
                        res(message.data.allBlocks);
                      } else {
                        res([]);
                      }
                      this.socket.off('message', listenerFn);
                    }
                  };


                  this.socket.on('message', listenerFn);
                  this.socket.send(JSON.stringify(payload));
                });
              }

              // TODO Try via API.
              return Promise.reject();
            }
          }
        }
      });
    });
  }
}
