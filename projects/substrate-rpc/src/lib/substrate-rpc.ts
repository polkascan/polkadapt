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

import { ApiRx, WsProvider } from '@polkadot/api';
import { AdapterBase, types } from '@polkadapt/core';
import { ApiOptions } from '@polkadot/api/types';
import { Observable } from 'rxjs';
import {
  getBlock,
  getBlockHash,
  getHeader,
  getTimestamp,
  getFinalizedHead,
  getLatestBlock,
  subscribeNewBlock
} from './web-socket/block.functions';
import {
  getAccount,
  getAccountBalances,
  getAccountChildrenIds,
  getAccountFlags,
  getAccountIdFromIndex,
  getAccountInformation,
  getAccountParentId,
  getAccountStaking,
  getChildAccountName,
  getIdentity,
  getIndexFromAccountId
} from './web-socket/account.functions';
import { getChainProperties } from './web-socket/chain.functions';
import { getRuntimePallet, getRuntimePallets } from './web-socket/runtime-pallet.functions';
import { getRuntimeCall, getRuntimeCalls } from './web-socket/runtime-call.functions';
import { getRuntimeEvent, getRuntimeEvents } from './web-socket/runtime-event.functions';
import { getLatestRuntime, getRuntime } from './web-socket/runtime.functions';
import { getRuntimeStorage, getRuntimeStorages } from './web-socket/runtime-storage.functions';
import { getRuntimeConstant, getRuntimeConstants } from './web-socket/runtime-constant.functions';
import { getRuntimeErrorMessage, getRuntimeErrorMessages } from './web-socket/runtime-error-message.functions';
import { getRuntimeCallArguments } from './web-socket/runtime-call-arguments.functions';
import { getRuntimeEventAttributes } from './web-socket/runtime-event-attribute.functions';
import { getEvent } from './web-socket/event.functions';
import { getExtrinsic } from './web-socket/extrinsic.functions';

export type Api = {
  getChainProperties: () => Observable<types.ChainProperties>;
  subscribeNewBlock: () => Observable<types.Block>;
  getBlock: (hashOrNumber: string | number) => Observable<types.Block>;
  getLatestBlock: () => Observable<types.Block>;
  getBlockHash: (blockNumber: number) => Observable<string>;
  getFinalizedHead: () => Observable<string>;
  getHeader: (hashOrNumber: string | number) => Observable<types.Header>;
  getTimestamp: (hashOrNumber?: number | string) => Observable<number>;
  getAccountIdFromIndex: (index: number) => Observable<string | null>;
  getAccount: (accountId: string, blockHash?: string) => Observable<types.Account>;
  getIndexFromAccountId: (accountId: string) => Observable<number | null>;
  getIdentity: (accountId: string) => Observable<types.AccountIdentity>;
  getAccountParentId: (accountId: string) => Observable<string | null>;
  getAccountChildrenIds: (accountId: string) => Observable<string[]>;
  getChildAccountName: (accountId: string) => Observable<string | null>;
  getAccountInformation: (accountId: string) => Observable<types.AccountInformation>;
  getAccountFlags: (accountId: string) => Observable<types.AccountFlags>;
  getAccountBalances: (accountId: string) => Observable<types.AccountBalances>;
  getAccountStaking: (accountId: string) => Observable<types.AccountStaking>;
  getEvent: (blockNumber: number, eventIdx: number) => Observable<types.Event>;
  getExtrinsic: (blockNumber: number, extrinsicIdx: number) => Observable<types.Extrinsic>;
  getRuntime: (specName: string, specVersion: number) => Observable<types.Runtime>;
  getLatestRuntime: () => Observable<types.Runtime>;
  getRuntimePallet: (specName: string, specVersion: number, pallet: string) => Observable<types.RuntimePallet>;
  getRuntimePallets: (specName: string, specVersion: number) => Observable<types.RuntimePallet[]>;
  getRuntimeCall: (specName: string, specVersion: number, pallet: string, callName: string) => Observable<types.RuntimeCall>;
  getRuntimeCalls: (specName: string, specVersion: number, pallet?: string) => Observable<types.RuntimeCall[]>;
  getRuntimeCallArguments: (specName: string, specVersion: number, pallet: string, callName: string) =>
    Observable<types.RuntimeCallArgument[]>;
  getRuntimeEvent: (specName: string, specVersion: number, pallet: string, eventName: string) => Observable<types.RuntimeEvent>;
  getRuntimeEvents: (specName: string, specVersion: number, pallet?: string) => Observable<types.RuntimeEvent[]>;
  getRuntimeEventAttributes: (specName: string, specVersion: number, pallet: string, eventName: string) =>
    Observable<types.RuntimeEventAttribute[]>;
  getRuntimeStorage: (specName: string, specVersion: number, pallet: string, storageName: string) => Observable<types.RuntimeStorage>;
  getRuntimeStorages: (specName: string, specVersion: number, pallet?: string) => Observable<types.RuntimeStorage[]>;
  getRuntimeConstant: (specName: string, specVersion: number, pallet: string, constantName: string) =>
    Observable<types.RuntimeConstant>;
  getRuntimeConstants: (specName: string, specVersion: number, pallet?: string) =>
    Observable<types.RuntimeConstant[]>;
  getRuntimeErrorMessage: (specName: string, specVersion: number, pallet: string, errorName: string) =>
    Observable<types.RuntimeErrorMessage>;
  getRuntimeErrorMessages: (specName: string, specVersion: number, pallet?: string) => Observable<types.RuntimeErrorMessage[]>;
};

export interface Config {
  chain: string;
  providerUrl?: string;
  apiOptions?: ApiOptions;
}

export type EventNames = 'readyStateChange' | 'endpointChange' | 'error' | 'connected' | 'disconnected';

type ActiveCall = {
  created: Date;
  apiPath: string[];
  argArray: unknown[];
  resolve: (result: any) => void;
  unsubscribe?: () => void;
};

export class Adapter extends AdapterBase {
  name = 'substrate-rpc';
  config: Config;
  promise: Promise<Api>;
  apiPromise: Promise<ApiRx>;
  api: Api;
  private resolvePromise: ((api: ApiRx) => void) | undefined;
  private proxyApi: ApiRx | undefined;
  private unproxiedApi: ApiRx | undefined;
  private isConnected: Promise<boolean> = Promise.resolve(false);
  private resolveConnected: ((v: boolean) => void) | undefined;
  private activeCalls: { [K: string]: ActiveCall } = {};
  private activeSubscriptions: { [K: string]: ActiveCall } = {};
  private lastNonce = -1;
  private wsProvider: WsProvider | null = null;
  private wsEventOffFunctions: (() => void)[] = [];
  private wsConnected = false;
  private eventListeners: { [eventName: string]: ((...args: any[]) => any)[] } = {};
  private urlChanged = false;

  constructor(config: Config) {
    super(config.chain);
    this.config = config;
    // Create the initial Promise to expose to PolkADAPT Core.
    this.apiPromise = this.createPromise();

    this.api = {
      getChainProperties: getChainProperties(this),
      getBlock: getBlock(this),
      getLatestBlock: getLatestBlock(this),
      subscribeNewBlock: subscribeNewBlock(this),
      getBlockHash: getBlockHash(this),
      getFinalizedHead: getFinalizedHead(this),
      getHeader: getHeader(this),
      getTimestamp: getTimestamp(this),
      getAccount: getAccount(this),
      getAccountIdFromIndex: getAccountIdFromIndex(this),
      getIndexFromAccountId: getIndexFromAccountId(this),
      getIdentity: getIdentity(this),
      getAccountParentId: getAccountParentId(this),
      getAccountChildrenIds: getAccountChildrenIds(this),
      getChildAccountName: getChildAccountName(this),
      getAccountInformation: getAccountInformation(this),
      getAccountFlags: getAccountFlags(this),
      getAccountBalances: getAccountBalances(this),
      getAccountStaking: getAccountStaking(this),
      getEvent: getEvent(this),
      getExtrinsic: getExtrinsic(this),
      getRuntime: getRuntime(this),
      getLatestRuntime: getLatestRuntime(this),
      getRuntimePallet: getRuntimePallet(this),
      getRuntimePallets: getRuntimePallets(this),
      getRuntimeCall: getRuntimeCall(this),
      getRuntimeCalls: getRuntimeCalls(this),
      getRuntimeCallArguments: getRuntimeCallArguments(this),
      getRuntimeEvent: getRuntimeEvent(this),
      getRuntimeEvents: getRuntimeEvents(this),
      getRuntimeEventAttributes: getRuntimeEventAttributes(this),
      getRuntimeStorage: getRuntimeStorage(this),
      getRuntimeStorages: getRuntimeStorages(this),
      getRuntimeConstant: getRuntimeConstant(this),
      getRuntimeConstants: getRuntimeConstants(this),
      getRuntimeErrorMessage: getRuntimeErrorMessage(this),
      getRuntimeErrorMessages: getRuntimeErrorMessages(this)
    };
  }

  resolveActiveCall(nonce: string, result: unknown): void {
    const aCall: ActiveCall = this.activeCalls[nonce];
    if (aCall) {
      if (typeof result === 'function') {
        // The returned function is an unsubscribe function. We must remember this subscription, so we can
        // re-subscribe it when the endpoint of this adapter is changed intermittently.
        this.activeSubscriptions[nonce] = aCall;
        // Save the current unsubscribe function in the remembered subscription.
        this.activeSubscriptions[nonce].unsubscribe = result as (() => void);
        // Hijack the returned unsubscribe function, so we can fire the correct original function (which may have
        // changed after a resubscribe) and forget this subscription once unsubscribed.
        result = () => {
          const fn = this.activeSubscriptions[nonce].unsubscribe;
          if (fn) {
            fn();
          }
          delete this.activeSubscriptions[nonce];
        };
      }
      // Finally, after registering the API call and hijacking any unsubscribe function, we can resolve this Promise with the result.
      aCall.resolve(result);
      // Now that we've received a response from the original call, we can forget it.
      delete this.activeCalls[nonce];
    }
  }

  async connect(): Promise<void> {
    const connected: boolean = await this.isConnected;
    if (connected && !this.urlChanged) {
      // Active connection was already established and url hasn't changed. Nothing to do.
      return;
    }

    // If the url was changed, we can now reset the flag.
    this.urlChanged = false;

    // Should it already have been connected, disconnect now.
    await this.disconnect();
    // Create a Promise for the connection to complete. This is used on several occasions.
    this.isConnected = new Promise(resolve => {
      // Create the actual Polkadot.js API instance.
      this.createApi().then(api => {
        this.unproxiedApi = api;
        // Set up a Proxy, so we can hijack the API.
        this.proxyApi = new Proxy(this.unproxiedApi, {
          get: (target, p: string) =>
            this.createFollowUpProxy(target, (target as { [K: string]: any })[p], [p])
        });
        // Set up the resolve function.
        this.resolveConnected = (v) => {
          this.resolveConnected = undefined;
          this.dispatchEvent('connected', {providerUrl: this.config.providerUrl});
          resolve(v);
        };
        // If the ws 'connected' event fired *before* this.proxyApi was set, we can now resolve the promises.
        if (this.wsConnected) {
          this.resolveCombined();
        }
      }, (e) => {
        resolve(false);
        throw e;
      });
    });
    await this.isConnected;
  }

  async disconnect(isError = false) {
    // If the promise is still unresolved, we can re-use it for the new connection.
    if (!this.resolvePromise) {
      // But it was already resolved, so we need to reset it.
      this.apiPromise = this.createPromise();
    }
    if (this.wsProvider) {
      // Remove the event listeners from the old wsProvider.
      this.wsEventOffFunctions.forEach(off => off());
      this.wsEventOffFunctions = [];
      this.wsProvider = null;
    }
    // Wait for isConnected to resolve, either being true or false.
    if (this.unproxiedApi) {
      await this.unproxiedApi.disconnect();
      this.proxyApi = undefined;
      this.unproxiedApi = undefined;
    }
    this.isConnected = Promise.resolve(false);
    this.dispatchEvent(isError ? 'error' : 'disconnected');
  }

  setUrl(url: string) {
    if (url && url !== this.config.providerUrl) {
      this.config.providerUrl = url;
      this.urlChanged = true;
    }
  }

  // Add listener function.
  addEventListener(messageType: EventNames, listener: (...args: unknown[]) => any): void {
    if (!this.eventListeners[messageType]) {
      this.eventListeners[messageType] = [];
    }
    this.eventListeners[messageType].push(listener);
  }

  // Remove listener for a specific event.
  removeEventListener(eventName: string, listener: (...args: unknown[]) => any): void {
    if (this.eventListeners[eventName] !== undefined) {
      let index = -1;
      this.eventListeners[eventName].forEach((regFn, i) => {
        if (regFn === listener) {
          index = i;
        }
      });
      if (index !== -1) {
        this.eventListeners[eventName].splice(index, 1);
      }
    }
  }

  // Remove all listeners for a specific event.
  removeAllEventListeners(eventName: string): void {
    delete this.eventListeners[eventName];
  }

  // Trigger handler function on event.
  dispatchEvent(eventName: string, ...args: unknown[]): boolean {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      this.eventListeners[eventName].forEach((listener) => {
        listener(...args);
      });
      return true;
    }
    return false;
  }

  // Get a list of all event names with active listeners.
  eventNames(): string[] {
    const eventNames: string[] = [];
    Object.keys(this.eventListeners).forEach((key) => {
      if (this.eventListeners[key] && this.eventListeners[key].length) {
        eventNames.push(key);
      }
    });
    return eventNames;
  }

  // Return all listeners registered on an event.
  listeners(eventName: string): ((...args: unknown[]) => any)[] {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      return this.eventListeners[eventName];
    } else {
      return [];
    }
  }

  once(messageType: EventNames, listener: (...args: unknown[]) => any): void {
    const wrapped = (...args: unknown[]) => {
      listener(...args);
      this.removeEventListener(messageType, wrapped);
    };
    this.addEventListener(messageType, wrapped);
  }

  on(messageType: EventNames, listener: (...args: unknown[]) => any): void {
    this.addEventListener(messageType, listener);
  }

  off(eventName: string, listener: (...args: unknown[]) => any): void {
    this.removeEventListener(eventName, listener);
  }

  private createPromise(): Promise<ApiRx> {
    return new Promise<ApiRx>(resolve => {
      // Set up a one-time-only function to resolve the initial entrypoint Promise after connecting.
      this.resolvePromise = api => {
        // Unset the function.
        this.resolvePromise = undefined;
        // Resolve the entrypoint.
        resolve(api);
      };
    });
  }

  private createFollowUpProxy(parentObj: any, target: any, apiPath: string[]): unknown {
    // We use a recursive Proxy to do some bookkeeping on active calls and subscriptions.
    if (typeof target === 'object' && !Array.isArray(target) || typeof target === 'function') {
      // If the target is an object, extend the property path and proxy deeper.
      // If the target is a function, intercept the call to this function
      return new Proxy(target, {
        get: (t: { [p: string]: any }, p: string) => {
          if (p in t) {
            apiPath.push(p);
            return this.createFollowUpProxy(t, t[p], apiPath);
          }
          return;
        },
        apply: (t: (...args: any[]) => unknown, thisArg, argArray) => {
          const result: unknown = t.apply(parentObj, argArray);
          if (result instanceof Promise) {
            // Hijack it and return our own.
            return new Promise((resolve, reject) => {
              // Register this call. If it's disconnected without result, we can re-submit the call to another endpoint.
              this.lastNonce += 1;
              const nonce = this.lastNonce.toString();
              this.activeCalls[nonce] = {created: new Date(), apiPath, argArray, resolve};
              // Now await the result and resolve this result Promise.
              result.then(value => {
                this.resolveActiveCall(nonce, value);
              }, e => {
                reject(e);
              });
            });
          } else {
            return result;
          }
        }
      });
    } else {
      // End of the line, not an object or function, so just return this value.
      return target;
    }
  }

  private resolveCombined() {
    if (this.wsConnected && this.proxyApi) {
      if (this.resolvePromise) {
        // Resolve the unresolved Promise.
        this.resolvePromise(this.proxyApi);
      } else {
        // This is a new connection. We can just replace the Promise with an already resolved one.
        this.apiPromise = Promise.resolve(this.proxyApi);
      }
      if (this.resolveConnected) {
        this.resolveConnected(true);
      }
      this.resumeCalls();
    }
  }

  private resumeCalls(): void {
    Object.keys(this.activeSubscriptions).forEach(nonce => {
      const sub: ActiveCall = this.activeSubscriptions[nonce];
      sub.created = new Date();
      // Replay the subscription function on the unproxied API, so it won't be saved multiple times in activeSubscriptions.
      let apiPart = this.unproxiedApi as unknown;
      sub.apiPath.forEach(p => {
        apiPart = (apiPart as { [p: string]: unknown })[p];
      });
      const subscribe = apiPart as (...args: unknown[]) => Promise<() => void>;
      // We need to re-use the existing subscription object, because the subscription caller has received a pointer to
      // the hijacked unsubscribe function in the existing object.
      subscribe(...sub.argArray).then(unsub => {
        sub.unsubscribe = unsub;
      }, e => {
        throw e;
      });
    });

    // Run activeCalls again *after* activeSubscriptions, because these calls might end up creating new subscriptions.
    Object.keys(this.activeCalls).forEach(nonce => {
      const aCall: ActiveCall = this.activeCalls[nonce];
      aCall.created = new Date();
      let apiPart = this.unproxiedApi as unknown;
      aCall.apiPath.forEach(p => {
        apiPart = (apiPart as { [p: string]: unknown })[p];
      });
      const run = apiPart as (...args: unknown[]) => Promise<unknown>;
      run(...aCall.argArray).then(result => {
        this.resolveActiveCall(nonce, result);
      }, e => {
        throw e;
      });
    });
  }

  private async createApi(): Promise<ApiRx> {
    if (!this.config.providerUrl) {
      throw new Error('[SubstrateRPCAdapter] Can\'t create Polkadot.js API without a providerUrl.');
    }
    this.wsProvider = new WsProvider(this.config.providerUrl, 0);
    this.wsEventOffFunctions.push(this.wsProvider.on('error', () => this.handleWsError()));
    this.wsEventOffFunctions.push(this.wsProvider.on('connected', () => this.handleWsConnected()));
    this.wsEventOffFunctions.push(this.wsProvider.on('disconnected', () => this.handleWsDisconnected()));
    await this.wsProvider.connect();

    let api: ApiRx | undefined;
    try {
      const apiOptions: ApiOptions = {provider: this.wsProvider};
      if (this.config.apiOptions) {
        // Provider can be overwritten by the given apiOptions.
        Object.assign(apiOptions, this.config.apiOptions);
      }
      api = await ApiRx.create(apiOptions).toPromise();
    } catch (e) {
      console.error('[SubstrateRPCAdapter] Could not create apiPromise');
      throw e;
    }
    if (!api) {
      throw new Error('[SubstrateRPCAdapter] Could not create apiPromise');
    }
    return api;
  }

  private handleWsConnected() {
    this.wsConnected = true;
    if (this.proxyApi) {
      // Connection has been established *after* this.proxyApi was set. Resolve the promises.
      this.resolveCombined();
    }
  }

  private async handleWsError() {
    this.wsConnected = false;
    await this.disconnect(true);
  }

  private async handleWsDisconnected() {
    this.wsConnected = false;
    await this.disconnect();
  }
}
