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

import { ApiPromise, WsProvider } from '@polkadot/api';
import { AdapterBase } from '@polkadapt/core';
import { ApiOptions } from '@polkadot/api/types';

type Polkadapted<T> = {
  [K in keyof T]:
    T[K] extends ((...args: any[]) => any) ? T[K] : (Polkadapted<T[K]> & Promise<T[K]>);
};

export type Api = Polkadapted<ApiPromise>;

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
  promise: Promise<ApiPromise>;
  private resolvePromise: ((api: ApiPromise) => void) | undefined;
  private api: ApiPromise | undefined;
  private unproxiedApi: ApiPromise | undefined;
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
    this.promise = this.createPromise();
  }

  get isReady(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.isConnected.then(connected => {
        if (!connected) {
          throw new Error('[SubstrateRPCAdapter] Could not check readiness, adapter is not connected');
        }
        if (this.unproxiedApi) {
          this.unproxiedApi.isReadyOrError.then(() => {
            resolve(true);
          }, e => {
            reject(e);
          });
        } else {
          throw new Error('[SubstrateRPCAdapter] Could not check readiness, no apiPromise available');
        }
      }, e => {
        reject(e);
      });
    });
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
        this.api = new Proxy(this.unproxiedApi, {
          get: (target, p: string) =>
            this.createFollowUpProxy(target, (target as { [K: string]: any })[p], [p])
        });
        // Set up the resolve function.
        this.resolveConnected = (v) => {
          this.resolveConnected = undefined;
          this.dispatchEvent('connected', {providerUrl: this.config.providerUrl});
          resolve(v);
        };
        // If the ws 'connected' event fired *before* this.api was set, we can now resolve the promises.
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

  async disconnect(isError: boolean = false) {
    // If the promise is still unresolved, we can re-use it for the new connection.
    if (!this.resolvePromise) {
      // But it was already resolved, so we need to reset it.
      this.promise = this.createPromise();
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
      this.api = undefined;
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

  private createPromise(): Promise<ApiPromise> {
    return new Promise<ApiPromise>(resolve => {
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
    if (this.wsConnected && this.api) {
      if (this.resolvePromise) {
        // Resolve the unresolved Promise.
        this.resolvePromise(this.api);
      } else {
        // This is a new connection. We can just replace the Promise with an already resolved one.
        this.promise = Promise.resolve(this.api);
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

  private async createApi(): Promise<ApiPromise> {
    if (!this.config.providerUrl) {
      throw new Error('[SubstrateRPCAdapter] Can\'t create Polkadot.js API without a providerUrl.');
    }
    this.wsProvider = new WsProvider(this.config.providerUrl, 0);
    this.wsEventOffFunctions.push(this.wsProvider.on('error', () => this.handleWsError()));
    this.wsEventOffFunctions.push(this.wsProvider.on('connected', () => this.handleWsConnected()));
    this.wsEventOffFunctions.push(this.wsProvider.on('disconnected', () => this.handleWsDisconnected()));
    await this.wsProvider.connect();

    try {
      const apiOptions: ApiOptions = {provider: this.wsProvider};
      if (this.config.apiOptions) {
        // Provider can be overwritten by the given apiOptions.
        Object.assign(apiOptions, this.config.apiOptions);
      }
      return await ApiPromise.create(apiOptions);
    } catch (e) {
      console.error('[SubstrateRPCAdapter] Could not create apiPromise');
      throw e;
    }
  }

  private handleWsConnected() {
    this.wsConnected = true;
    if (this.api) {
      // Connection has been established *after* this.api was set. Resolve the promises.
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
