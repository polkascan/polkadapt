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
import { Block } from './polkascan.types';

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
  rpc: {
    chain: {
      subscribeFinalizedHeads: (callback: (blocks: Block[]) => void) => Promise<() => void>,
      getLatestFinalizedBlocks: (pageSize: number) => Promise<any>
    }
  }
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

  constructor(config: Config) {
    super(config.chain);
    this.config = config;

    if (this.config.apiEndpoint) {
      this.api = new PolkascanApi(this.config.apiEndpoint);
    }
    if (this.config.wsEndpoint) {
      this.socket = new PolkascanWebSocket(this.config.wsEndpoint, config.chain);
    }

    this.promise = new Promise((resolve) => {
      resolve({
        query: {
          council: {
            getVotes: async (address: string) => this.api && this.api.getMemberVotes(address)
          },
          system: {
            account: async (address: string) => this.api && this.api.getAccount(address)
          },
          block: {
            all: async () => {
              if (this.socket) {
                const query = 'query allBlockies { allBlocks { id, hash } }';
                const result = await this.socket.query(query);

                try {
                  return result.data.allBlocks;
                } catch (e) {
                  return [] ;
                }
              } else if (this.api) {
                // In case we can fallback on an api call.
              }

              return Promise.reject();
            }
          }
        },
        rpc: {
          chain: {
            subscribeFinalizedHeads: async (callback): Promise<() => void> => {
              const query = 'subscription { blockSub {id, hash} }';
              // return the unsubscribe function.
              return await this.socket.createSubscription(query, (result) => {
                if (result.payload
                  && result.payload.data
                  && result.payload.data.blockSub) {
                  callback(result.payload.data.blockSub);
                }
              });
              // TODO For now only websocket version, but we can also create a fallback version to the API with polling.
            },
            getLatestFinalizedBlocks: async (pageSize): Promise<any> => {
              if (this.socket) {
                const query = 'query allBlockies { allBlocks { id, hash, finalized, extrinsics, events } }'; // Temporary query.
                const result = await this.socket.query(query);

                try {
                  return result.data.allBlocks;
                } catch (e) {
                  return [];
                }
              }

              return Promise.reject();
            }
          }
        }
      });
    });
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  get isReady(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.socket) {
        resolve(true);

      } else if (this.socket.websocketReady) {
        resolve(true);

      } else {
        const readyCallback = (ready: boolean) => {
          if (ready) {
            removeListeners();
            resolve(true);
          }
        };

        const closeCallback = () => {
          removeListeners();
          reject('Polkascan websocket connection closed.');
        };

        const removeListeners = () => {
          // Remove listeners after error or readyChange.
          this.socket.off('readyChange', readyCallback);
          this.socket.off('close', closeCallback);
        };

        // Subscribe to the websockets readyChange or error.
        this.socket.on('readyChange', readyCallback);
        this.socket.on('close', closeCallback);
      }
    });
  }
}
