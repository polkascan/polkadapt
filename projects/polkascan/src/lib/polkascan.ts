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
import { PolkascanWebSocket } from './polkascan.web-socket';
import { Block } from './polkascan.types';

export type Api = {
  polkascan: {
    getBlock: (hashOrNumber?: string | number) => Promise<Block>,
    getBlocksFrom: (hashOrNumber: string | number, pageSize: number) => Promise<Block[]>;
    getBlocksUntil: (hashOrNumber: string | number, pageSize: number) => Promise<Block[]>;
    getLatestFinalizedBlocks: (callback: (block: Block) => void) => Promise<() => void>;
  }
  rpc: {
    chain: {
      getBlock: (hash: string) => Promise<{ count_extrinsics: number }>;
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
        polkascan: {
          getBlock: async hashOrNumber => {
            let filter: string;
            if (typeof hashOrNumber === 'string') {
              // Fetch specific block;
              filter = `filters: { hash: "${hashOrNumber}" }`;
            } else if (Number.isInteger(hashOrNumber)) {
              filter = `filters: { id: "${hashOrNumber} }`;
            } else if (hashOrNumber !== undefined) {
              // hashOrNumber is defined but is not a string or integer.
              throw new Error('Supplied attribute is not of type string or number.');
            }

            const query = `query { block(${filter}) { id, hash, parentHash, stateRoot, extrinsicsRoot, countExtrinsics, countEvents, runtimeId } }`;
            try {
              const result = await this.socket.query(query);
              const block = result.payload.data.block;
              block.number = block.id; // Fix when backend contains number as attribute
              return block;
            } catch (e) {
              return undefined;
            }
          },
          getBlocksFrom: async (hashOrNumber, pageSize) => {
            // TODO Build me
            return [];
          },
          getBlocksUntil: async (hashOrNumber, pageSize) => {
            let filter: string;
            if (hashOrNumber) {
              // Fetch specific block;
              filter = typeof hashOrNumber === 'string' ? `filters: {hash: "${hashOrNumber}"}` : `filters: {id: "${hashOrNumber}"}`;
            }

            // TODO FIX PAGE SIZE. Write correct query.
            const query =
              `query { blocks { id, hash, parentHash, stateRoot, extrinsicsRoot, countExtrinsics, countEvents, runtimeId } }`;
            try {
              const result = await this.socket.query(query);
              const blocks: Block[] = result.payload.data.blocks;
              blocks.forEach((block) => block.number = block.id); // Fix when backend contains number as attribute.
              return blocks;
            } catch (e) {
              return [];
            }
          },
          getLatestFinalizedBlocks: async callback => {
            const query = 'subscription { block { id, hash, parentHash, stateRoot, extrinsicsRoot, countExtrinsics, countEvents, runtimeId } }';
            // return the unsubscribe function.
            return await this.socket.createSubscription(query, (result) => {
              try {
                const block = result.payload.data.block;
                block.number = block.id; // Fix when backend contains number as attribute
                callback(block);
              } catch (e) {
                // Ignore.
              }
            });
          }
        },
        rpc: {
          chain: {
            getBlock: async (hash) => {
              if (typeof hash !== 'string') {
                return {};
              }

              // Get data from polkascan to augment it to the rpc getBlock.
              const query = 'query { block { id, countExtrinsics, countEvents } }';
              try {
                const result = await this.socket.query(query);
                return result.payload.data.block;
              } catch (e) {
                return {id: undefined, countExtrinsics: undefined, countEvent: undefined};
              }
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
