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
import { PolkascanExplorerWebSocket } from './polkascan-explorer.web-socket';
import * as pst from './polkascan-explorer.types';
import {
  getBlock,
  getBlockAugmentation,
  getBlocks,
  getBlocksFrom,
  getBlocksUntil,
  getLatestBlock,
  subscribeNewBlock
} from './web-socket/block.functions';
import { EventsFilters, getEvent, getEvents, subscribeNewEvent } from './web-socket/event.functions';
import {
  ExtrinsicsFilters,
  getExtrinsic,
  getExtrinsics,
  subscribeNewExtrinsic
} from './web-socket/extrinsic.functions';
import { getLog, getLogs, subscribeNewLog } from './web-socket/log.functions';
import { getLatestRuntime, getRuntime, getRuntimes } from './web-socket/runtime.functions';
import { getRuntimeCall, getRuntimeCalls } from './web-socket/runtime-call.functions';
import { getRuntimeCallArguments } from './web-socket/runtime-call-argument.functions';
import { getRuntimeConstant, getRuntimeConstants } from './web-socket/runtime-constant.functions';
import { getRuntimeErrorMessage, getRuntimeErrorMessages } from './web-socket/runtime-error-message.functions';
import { getRuntimeEvent, getRuntimeEvents } from './web-socket/runtime-event.functions';
import { getRuntimeEventAttributes } from './web-socket/runtime-event-attribute.functions';
import { getRuntimePallet, getRuntimePallets } from './web-socket/runtime-pallet.functions';
import { getRuntimeStorage, getRuntimeStorages } from './web-socket/runtime-storage.functions';
import { getRuntimeType, getRuntimeTypes } from './web-socket/runtime-type.functions';
import { getTransfer, getTransfers, subscribeNewTransfer, TransfersFilters } from './web-socket/transfer.functions';


export type Api = {
  polkascan: {
    chain: {
      getBlock: (hashOrNumber: string | number) =>
        Promise<pst.Block>;
      getLatestBlock: () =>
        Promise<pst.Block>;
      getBlocks: (pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Block>>;
      getBlocksFrom: (hashOrNumber: string | number, pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Block>>;
      getBlocksUntil: (hashOrNumber: string | number, pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Block>>;
      subscribeNewBlock: (callback: (block: pst.Block) => void) =>
        Promise<() => void>;
      getEvent: (blockNumber: number, eventIdx: number) =>
        Promise<pst.Event>;
      getEvents: (filters?: EventsFilters, pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Event>>;
      subscribeNewEvent: (filtersOrCallback: ((event: pst.Event) => void) | EventsFilters, callback?: (event: pst.Event) => void) =>
        Promise<() => void>;
      getExtrinsic: (blockNumber: number, eventIdx: number) =>
        Promise<pst.Extrinsic>;
      getExtrinsics: (filters?: ExtrinsicsFilters, pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Extrinsic>>;
      subscribeNewExtrinsic: (filtersOrCallback: ((extrinsic: pst.Extrinsic) => void) | ExtrinsicsFilters,
                              callback?: (extrinsic: pst.Extrinsic) => void) =>
        Promise<() => void>;
      getLog: (blockNumber: number, logIdx: number) =>
        Promise<pst.Log>;
      getLogs: (pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Log>>;
      subscribeNewLog: (callback: (log: pst.Log) => void) =>
        Promise<() => void>;
      getTransfer: (blockNumber: number, eventIdx: number) =>
        Promise<pst.Transfer>;
      getTransfers: (filters?: TransfersFilters, pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Transfer>>;
      subscribeNewTransfer: (filtersOrcallback?: ((log: pst.Transfer) => void) | TransfersFilters,
                             callback?: (log: pst.Transfer) => void) =>
        Promise<() => void>;
    };
    state: {
      getRuntime: (specName: string, specVersion: number) =>
        Promise<pst.Runtime>;
      getRuntimes: (pageSize?: number, pageKey?: string) =>
        Promise<pst.ListResponse<pst.Runtime>>;
      getLatestRuntime: () =>
        Promise<pst.Runtime>;
      getRuntimeCall: (specName: string, specVersion: number, pallet: string, callName: string) =>
        Promise<pst.RuntimeCall>;
      getRuntimeCalls: (specName: string, specVersion: number, pallet?: string) =>
        Promise<pst.ListResponse<pst.RuntimeCall>>;
      getRuntimeCallArguments: (specName: string, specVersion: number, pallet: string, callName: string) =>
        Promise<pst.ListResponse<pst.RuntimeCallArgument>>;
      getRuntimeConstant: (specName: string, specVersion: number, pallet: string, constantName: string) =>
        Promise<pst.RuntimeConstant>;
      getRuntimeConstants: (specName: string, specVersion: number, pallet?: string) =>
        Promise<pst.ListResponse<pst.RuntimeConstant>>;
      getRuntimeErrorMessage: (specName: string, specVersion: number, pallet: string, errorName: string) =>
        Promise<pst.RuntimeErrorMessage>;
      getRuntimeErrorMessages: (specName: string, specVersion: number, pallet?: string) =>
        Promise<pst.ListResponse<pst.RuntimeErrorMessage>>;
      getRuntimeEvent: (specName: string, specVersion: number, pallet: string, eventName: string) =>
        Promise<pst.RuntimeEvent>;
      getRuntimeEvents: (specName: string, specVersion: number, pallet?: string) =>
        Promise<pst.ListResponse<pst.RuntimeEvent>>;
      getRuntimeEventAttributes: (specName: string, specVersion: number, pallet: string, eventName: string) =>
        Promise<pst.ListResponse<pst.RuntimeEventAttribute>>;
      getRuntimePallet: (specName: string, specVersion: number, pallet: string) =>
        Promise<pst.RuntimePallet>;
      getRuntimePallets: (specName: string, specVersion: number) =>
        Promise<pst.ListResponse<pst.RuntimePallet>>;
      getRuntimeStorage: (specName: string, specVersion: number, pallet: string, storageName: string) =>
        Promise<pst.RuntimeStorage>;
      getRuntimeStorages: (specName: string, specVersion: number, pallet?: string) =>
        Promise<pst.ListResponse<pst.RuntimeStorage>>;
      getRuntimeType: (specName: string, specVersion: number, pallet: string, scaleType: string) =>
        Promise<pst.RuntimeType>;
      getRuntimeTypes: (specName: string, specVersion: number, pallet?: string) =>
        Promise<pst.ListResponse<pst.RuntimeType>>;
    };
  };
  rpc: {
    chain: {
      getBlock: (hash: string) => Promise<any>;
    };
  };
};

export interface Config {
  chain: string;
  wsEndpoint?: string;
  connectionRetries?: number;
}


export class Adapter extends AdapterBase {
  name = 'polkascan-explorer';
  promise: Promise<Api> | undefined;
  socket: PolkascanExplorerWebSocket | undefined;
  config: Config;

  constructor(config: Config) {
    super(config.chain);
    this.config = config;

    if (this.config.wsEndpoint) {
      this.socket = new PolkascanExplorerWebSocket(this.config.wsEndpoint, config.chain);
    }

    this.promise = new Promise((resolve) => {
      resolve({
        polkascan: {
          chain: {
            getBlock: getBlock(this),
            getLatestBlock: getLatestBlock(this),
            getBlocks: getBlocks(this),
            getBlocksFrom: getBlocksFrom(this),
            getBlocksUntil: getBlocksUntil(this),
            subscribeNewBlock: subscribeNewBlock(this),
            getEvent: getEvent(this),
            getEvents: getEvents(this),
            subscribeNewEvent: subscribeNewEvent(this),
            getExtrinsic: getExtrinsic(this),
            getExtrinsics: getExtrinsics(this),
            subscribeNewExtrinsic: subscribeNewExtrinsic(this),
            getLog: getLog(this),
            getLogs: getLogs(this),
            subscribeNewLog: subscribeNewLog(this),
            getTransfer: getTransfer(this),
            getTransfers: getTransfers(this),
            subscribeNewTransfer: subscribeNewTransfer(this),
          },
          state: {
            getRuntime: getRuntime(this),
            getRuntimes: getRuntimes(this),
            getLatestRuntime: getLatestRuntime(this),
            getRuntimeCall: getRuntimeCall(this),
            getRuntimeCalls: getRuntimeCalls(this),
            getRuntimeCallArguments: getRuntimeCallArguments(this),
            getRuntimeConstant: getRuntimeConstant(this),
            getRuntimeConstants: getRuntimeConstants(this),
            getRuntimeErrorMessage: getRuntimeErrorMessage(this),
            getRuntimeErrorMessages: getRuntimeErrorMessages(this),
            getRuntimeEvent: getRuntimeEvent(this),
            getRuntimeEvents: getRuntimeEvents(this),
            getRuntimeEventAttributes: getRuntimeEventAttributes(this),
            getRuntimePallet: getRuntimePallet(this),
            getRuntimePallets: getRuntimePallets(this),
            getRuntimeStorage: getRuntimeStorage(this),
            getRuntimeStorages: getRuntimeStorages(this),
            getRuntimeType: getRuntimeType(this),
            getRuntimeTypes: getRuntimeTypes(this)
          }
        },
        rpc: {
          chain: {
            getBlock: getBlockAugmentation(this)
          }
        }
      });
    });
  }


  get isReady(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let timeout: number;

      if (!this.socket) {
        resolve(true);

      } else if (this.socket.websocketReady) {
        resolve(true);

      } else {
        const readyCallback = (ready: boolean) => {
          clearTimeout(timeout);
          if (ready) {
            removeListeners();
            resolve(true);
          }
        };

        const closeCallback = () => {
          clearTimeout(timeout);
          removeListeners();
          reject('PolkascanExplorer websocket connection closed.');
        };

        const removeListeners = () => {
          // Remove listeners after error or readyChange.
          if (this.socket) {
            this.socket.off('readyChange', readyCallback);
            this.socket.off('close', closeCallback);
          }
        };

        // Subscribe to the websockets readyChange or error.
        this.socket.on('readyChange', readyCallback);
        this.socket.on('close', closeCallback);

        timeout = setTimeout(() => {
          removeListeners();
          reject('PolkascanExplorer websocket connection timed out.');
        }, 10000);
      }
    });
  }


  connect(): void {
    if (this.config.wsEndpoint) {
      if (this.socket) {
        this.socket.wsEndpoint = this.config.wsEndpoint;
        if (this.socket.adapterRegistered) {
          this.socket.reconnect();
        } else {
          this.socket.connect();
        }
      } else {
        this.socket = new PolkascanExplorerWebSocket(this.config.wsEndpoint, this.config.chain);
        this.socket.connect();
      }
    }
  }


  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    } else {
      throw new Error(`[PolkascanExplorerAdapter] Can't disconnect! Socket not intialized.`);
    }
  }


  setWsUrl(url: string): void {
    if (url !== this.config.wsEndpoint) {
      this.config.wsEndpoint = url;
    }
  }
}
