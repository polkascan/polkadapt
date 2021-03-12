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
import * as pst from './polkascan.types';
import {
  getBlock,
  getBlocks,
  getBlockAugmentation,
  subscribeNewBlock, getBlocksFrom, getBlocksUntil
} from './web-socket/block.functions';
import { EventsFilters, getEvent, getEvents, subscribeNewEvent } from './web-socket/event.functions';
import {
  ExtrinsicsFilters,
  getExtrinsic,
  getExtrinsics,
  subscribeNewExtrinsic
} from './web-socket/extrinsic.functions';


export type Api = {
  polkascan: {
    getBlock: (hashOrNumber?: string | number) =>
      Promise<pst.Block>,
    getBlocks: (pageSize?: number, pageKey?: string) =>
      Promise<pst.ListResponse<pst.Block>>;
    getBlocksFrom: (hashOrNumber: string | number, pageSize?: number, pageKey?: string) =>
      Promise<pst.ListResponse<pst.Block>>;
    getBlocksUntil: (hashOrNumber: string | number, pageSize?: number, pageKey?: string) =>
      Promise<pst.ListResponse<pst.Block>>;
    subscribeNewBlock: (callback: (block: pst.Block) => void) =>
      Promise<() => void>;
    getEvent: (blockNumber?: number, eventIdx?: number) =>
      Promise<pst.Event>;
    getEvents: (filters?: EventsFilters, pageSize?: number, pageKey?: string) =>
      Promise<pst.ListResponse<pst.Event>>;
    subscribeNewEvent: (filtersOrCallback: (event: pst.Event) => void | EventsFilters, callback: (event: pst.Event) => void) =>
      Promise<() => void>;
    getExtrinsic: (blockNumber?: number, eventIdx?: number) =>
      Promise<pst.Extrinsic>;
    getExtrinsics: (filters?: ExtrinsicsFilters, pageSize?: number, pageKey?: string) =>
      Promise<pst.ListResponse<pst.Extrinsic>>;
    subscribeNewExtrinsic: (filtersOrCallback: (extrinsic: pst.Extrinsic) => void | ExtrinsicsFilters,
                            callback: (extrinsic: pst.Extrinsic) => void) =>
      Promise<() => void>;
  }
  rpc: {
    chain: {
      getBlock: (hash: string) => Promise<any>;
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
          getBlock: getBlock(this),
          getBlocks: getBlocks(this),
          getBlocksFrom: getBlocksFrom(this),
          getBlocksUntil: getBlocksUntil(this),
          subscribeNewBlock: subscribeNewBlock(this),
          getEvent: getEvent(this),
          getEvents: getEvents(this),
          subscribeNewEvent: subscribeNewEvent(this),
          getExtrinsic: getExtrinsic(this),
          getExtrinsics: getExtrinsics(this),
          subscribeNewExtrinsic: subscribeNewExtrinsic(this)
        },
        rpc: {
          chain: {
            getBlock: getBlockAugmentation(this)
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
