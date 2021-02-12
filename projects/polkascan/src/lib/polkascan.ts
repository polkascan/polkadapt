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
      subscribeFinalizedHeads: (callback: (blocks: Block[]) => void) => Promise<() => void>
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
  private n = 0;

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
            all: () => {
              if (this.socket) {
                return new Promise((res, rej) => {
                  const id = this.generateNonce();
                  const payload = {
                    type: GQLMSG.DATA,
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
                      this.socket.off('data', listenerFn);
                    }
                  };

                  this.socket.on('data', listenerFn);
                  this.socket.send(JSON.stringify(payload));
                });
              } else if (this.api) {
                // In case we can fallback on an api call.
              }

              return Promise.reject();
            }
          }
        },
        rpc: {
          chain: {
            subscribeFinalizedHeads: (callback) => {
              // TODO For now only websocket version, but we can also create a fallback version to the API with polling.
              return new Promise((res) => {
                try {
                  const id = this.generateNonce();
                  const payload = {
                    type: GQLMSG.START,
                    id,
                    payload: {
                      query: 'query blocksQuery { allBlocks { id, hash, parentHash, stateRoot, extrinsicsRoot } }',
                      operationName: null,
                    },
                  };

                  const listenerFn = (message: any) => {
                    if (message.id === id) {
                      if (message.payload
                        && message.payload.data
                        && message.payload.data.allBlocks) {
                        callback(message.payload.data.allBlocks);
                      }
                    }
                  };

                  const clearListenerFn = async () => {
                    this.socket.off('data', listenerFn);
                    this.socket.send(JSON.stringify({
                      type: GQLMSG.STOP,
                      id
                    }));
                  };

                  this.socket.on('data', listenerFn);
                  this.socket.send(JSON.stringify(payload));
                  res(clearListenerFn);

                } catch (e) {
                  throw new Error(e);
                }
              });
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

  generateNonce(): number {
    return this.n++;
  }

  get isReady(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
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

        const errorCallback = () => {
          removeListeners();
        };

        const removeListeners = () => {
          // Remove listeners after error or readyChange.
          this.socket.off('readyChange', readyCallback);
          this.socket.off('error', errorCallback);
        };

        // Subscribe to the websockets readyChange or error.
        this.socket.on('readyChange', readyCallback);
        this.socket.on('error', errorCallback);
      }
    });
  }
}
