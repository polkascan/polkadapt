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

import { AdapterBase, types } from '@polkadapt/core';
import { PolkascanExplorerWebSocket } from './polkascan-explorer.web-socket';
import {
  getBlock,
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
import { getLog, getLogs, LogsFilters, subscribeNewLog } from './web-socket/log.functions';
import { getLatestRuntime, getRuntime, getRuntimes } from './web-socket/runtime.functions';
import { getRuntimeCall, getRuntimeCalls } from './web-socket/runtime-call.functions';
import { getRuntimeCallArguments } from './web-socket/runtime-call-argument.functions';
import { getRuntimeConstant, getRuntimeConstants } from './web-socket/runtime-constant.functions';
import { getRuntimeErrorMessage, getRuntimeErrorMessages } from './web-socket/runtime-error-message.functions';
import { getRuntimeEvent, getRuntimeEvents } from './web-socket/runtime-event.functions';
import { getRuntimeEventAttributes } from './web-socket/runtime-event-attribute.functions';
import { getRuntimePallet, getRuntimePallets } from './web-socket/runtime-pallet.functions';
import { getRuntimeStorage, getRuntimeStorages } from './web-socket/runtime-storage.functions';
import { getTaggedAccount, getTaggedAccounts } from './web-socket/tagged-account.functions';
import {
  AccountEventsFilters,
  getEventsByAccount,
  subscribeNewEventByAccount
} from './web-socket/account-event.functions';
import { Observable } from 'rxjs';

export type Api = {
  getBlock: (hashOrNumber: string | number) =>
    Observable<types.Block>;
  getLatestBlock: () =>
    Observable<types.Block>;
  subscribeNewBlock: () =>
    Observable<types.Block>;
  getBlocks: (pageSize?: number) =>
    Observable<types.Block[]>;
  getBlocksFrom: (hashOrNumber: string | number, pageSize?: number) =>
    Observable<types.Block[]>;
  getBlocksUntil: (hashOrNumber: string | number, pageSize?: number) =>
    Observable<types.Block[]>;
  getEvent: (blockNumber: number, eventIdx: number) =>
    Observable<types.Event>;
  getEvents: (filters?: EventsFilters, pageSize?: number) =>
    Observable<types.Event[]>;
  subscribeNewEvent: (filters?: EventsFilters) =>
    Observable<types.Event>;
  getEventsByAccount: (accountIdHex: string,
                       filters?: AccountEventsFilters,
                       pageSize?: number) =>
    Observable<types.AccountEvent[]>;
  subscribeNewEventByAccount: (accountIdHex: string,
                               filters?: AccountEventsFilters) =>
    Observable<types.AccountEvent>;
  getExtrinsic: (blockNumberOrHash: number | string, extrinsicIdx?: number) =>
    Observable<types.Extrinsic>;
  getExtrinsics: (filters?: ExtrinsicsFilters, pageSize?: number) =>
    Observable<types.Extrinsic[]>;
  subscribeNewExtrinsic: (filters?: ExtrinsicsFilters) =>
    Observable<types.Extrinsic>;
  getLog: (blockNumber: number, logIdx: number) =>
    Observable<types.Log>;
  getLogs: (filters?: LogsFilters, pageSize?: number) =>
    Observable<types.Log[]>;
  subscribeNewLog: () =>
    Observable<types.Log>;
  getTaggedAccount: (accountId: string) =>
    Observable<types.TaggedAccount>;
  getTaggedAccounts: (tagType?: string) =>
    Observable<types.TaggedAccount[]>;
  getRuntime: (specName: string, specVersion: number) =>
    Observable<types.Runtime>;
  getRuntimes: (pageSize?: number) =>
    Observable<types.Runtime[]>;
  getLatestRuntime: () =>
    Observable<types.Runtime>;
  getRuntimeCall: (specName: string, specVersion: number, pallet: string, callName: string) =>
    Observable<types.RuntimeCall>;
  getRuntimeCalls: (specName: string, specVersion: number, pallet?: string) =>
    Observable<types.RuntimeCall[]>;
  getRuntimeCallArguments: (specName: string, specVersion: number, pallet: string, callName: string) =>
    Observable<types.RuntimeCallArgument[]>;
  getRuntimeConstant: (specName: string, specVersion: number, pallet: string, constantName: string) =>
    Observable<types.RuntimeConstant>;
  getRuntimeConstants: (specName: string, specVersion: number, pallet?: string) =>
    Observable<types.RuntimeConstant[]>;
  getRuntimeErrorMessage: (specName: string, specVersion: number, pallet: string, errorName: string) =>
    Observable<types.RuntimeErrorMessage>;
  getRuntimeErrorMessages: (specName: string, specVersion: number, pallet?: string) =>
    Observable<types.RuntimeErrorMessage[]>;
  getRuntimeEvent: (specName: string, specVersion: number, pallet: string, eventName: string) =>
    Observable<types.RuntimeEvent>;
  getRuntimeEvents: (specName: string, specVersion: number, pallet?: string) =>
    Observable<types.RuntimeEvent[]>;
  getRuntimeEventAttributes: (specName: string, specVersion: number, pallet: string, eventName: string) =>
    Observable<types.RuntimeEventAttribute[]>;
  getRuntimePallet: (specName: string, specVersion: number, pallet: string) =>
    Observable<types.RuntimePallet>;
  getRuntimePallets: (specName: string, specVersion: number) =>
    Observable<types.RuntimePallet[]>;
  getRuntimeStorage: (specName: string, specVersion: number, pallet: string, storageName: string) =>
    Observable<types.RuntimeStorage>;
  getRuntimeStorages: (specName: string, specVersion: number, pallet?: string) =>
    Observable<types.RuntimeStorage[]>;
};

export interface Config {
  chain: string;
  wsEndpoint?: string;
  connectionRetries?: number;
}


export class Adapter extends AdapterBase {
  name = 'polkascan-explorer';
  socket: PolkascanExplorerWebSocket | undefined;
  config: Config;
  api: Api;

  constructor(config: Config) {
    super(config.chain);
    this.config = config;

    if (this.config.wsEndpoint) {
      this.socket = new PolkascanExplorerWebSocket(this.config.wsEndpoint, config.chain);
    }

    this.api = {
      getBlock: getBlock(this),
      getLatestBlock: getLatestBlock(this),
      subscribeNewBlock: subscribeNewBlock(this),
      getBlocks: getBlocks(this),
      getBlocksFrom: getBlocksFrom(this),
      getBlocksUntil: getBlocksUntil(this),
      getEvent: getEvent(this),
      getEvents: getEvents(this),
      subscribeNewEvent: subscribeNewEvent(this),
      getEventsByAccount: getEventsByAccount(this),
      subscribeNewEventByAccount: subscribeNewEventByAccount(this),
      getExtrinsic: getExtrinsic(this),
      getExtrinsics: getExtrinsics(this),
      subscribeNewExtrinsic: subscribeNewExtrinsic(this),
      getLog: getLog(this),
      getLogs: getLogs(this),
      subscribeNewLog: subscribeNewLog(this),
      getTaggedAccount: getTaggedAccount(this),
      getTaggedAccounts: getTaggedAccounts(this),
      getLatestRuntime: getLatestRuntime(this),
      getRuntime: getRuntime(this),
      getRuntimes: getRuntimes(this),
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
    };
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
