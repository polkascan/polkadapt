/*
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

import {
  BehaviorSubject,
  debounceTime,
  filter,
  map,
  merge,
  Observable,
  of,
  ReplaySubject, share,
  shareReplay,
  Subject, Subscription, take, takeUntil, tap, timer
} from 'rxjs';
import { deepMerge } from './helpers';

export enum PolkadaptEventNames {
  readyChange = 'readyChange'
}

export type AdapterPromise = Promise<any>;

type PolkadaptRegisteredAdapter = {
  instance: AdapterBase;
};
type PolkadaptRunConfigConverter = (results: any) => any;
type PolkadaptRunConfigStrategy = 'merge' | 'combineLatest';
type PolkadaptRunConfigAdapters = (AdapterBase | string) | (AdapterBase | string)[];

export interface PolkadaptRunConfig {
  chain?: string;
  adapters?: PolkadaptRunConfigAdapters;
  augment?: boolean;
  observableResults?: boolean;
}

type CallContext = {
  path: string[];
  called: boolean;
  callArgs: unknown[];
};

type FunctionWithIdentifiers = {
  (arg: unknown): unknown;
  identifiers: string[];
};

//
// Polkadapt class
//
// To use polkadapt, start by creating a polkadapt instance.
// usage:      new Polkadapt()
//
// Typescript typings will be available by using the adapters exposed Api type.
// Typescript example:
//             const pa: Polkadapt<substrate.Api> = new Polkadapt()                    // Single adapter
//             const pa: Polkadapt<substrate.Api & polkascanExplorer.Api> = new Polkadapt()    // Multiple adapters
//
// Registering adapter instances in Polkadapt.
//             pa.register(adapter1, adapter2)
//
// Run adapters calls. Just use the run function and then use the call stack like you would use polkadotJs. Other
// adapters can share or have similar method chains that will return (combined) data. example:
//             pa.run('kusama').query.council.members()
//
export class Polkadapt<T> {
  public adapters: PolkadaptRegisteredAdapter[] = [];

  private eventListeners: { [eventName: string]: ((...args: unknown[]) => unknown)[] } = {};


  // Registers adapters in the polkadapt instance.
  // usage:      pa.register(adapter1, adapter2)
  register(...adapters: AdapterBase[]): void {
    for (const adapter of adapters) {
      const duplicate = this.adapters.find(a => a.instance === adapter);
      if (!duplicate) {
        this.adapters.push({instance: adapter});
        adapter.connect();
      }
    }
    this.emit('readyChange', false);
    this.ready().then(() => {
      this.emit('readyChange', true);
    }, e => {
      throw e;
    });
  }


  // Unregisters specific adapters or all adapters;
  unregister(...adapters: AdapterBase[]): void {
    if (adapters.length === 0) {
      adapters = this.adapters.map((a) => a.instance);
    }
    for (const adapter of adapters) {
      const index = this.adapters.map(a => a.instance).indexOf(adapter);
      if (index !== -1) {
        adapter.disconnect();
        this.adapters.splice(index, 1);
      }
    }
  }


  // Check if all adapter instances have connected with their hosts before allowing executing data retrieval calls.
  // usage:      await pa.ready()    or    pa.ready().then(() => {})
  async ready(adapters?: PolkadaptRegisteredAdapter[]): Promise<boolean> {
    adapters = adapters || this.adapters;

    if (this.adapters.length === 0) {
      throw new Error(
        'No registered adapter instances in this Polkadapt instance. Please create adapter instances and ' +
        'register them by calling register(...adapters) on the Polkadapt instance.'
      );
    }

    // Wait for all adapters to have been created.
    await Promise.all(adapters.map(a => a.instance.promise));

    // Wait until all connections are initialized.
    await Promise.all(adapters.map(a => a.instance.isReady));
    return true;
  }


  // Run is the entrypoint for the application that starts the method chain and will return a result or create a subscription triggering
  // a passed through callback.
  run(config?: PolkadaptRunConfig | string): T {
    let chain: string | undefined;
    let adapters: PolkadaptRegisteredAdapter[] = [];
    let augmentedResults = true;
    let observableResults = true;

    if (typeof config === 'string') {
      chain = config;
    } else if (config && Object.prototype.toString.call(config) === '[object Object]') {
      if (typeof config.chain === 'string') {
        chain = config.chain;
      }
      augmentedResults = config.augment !== false;
      observableResults = config.observableResults !== false;

      if (config.adapters) {
        let adapterNotFound = false;
        adapters = (Array.isArray(config.adapters) ? config.adapters : [config.adapters])
          .map((a) => {
            let found;
            if (Object.prototype.toString.call(a) === '[object String]') {
              // Check if the adapter is registered under the given name.
              found = this.adapters.filter(({instance}) => instance.name === a)[0];
            } else {
              // Check if the adapter is registered.
              found = this.adapters.filter(({instance}) => instance === a)[0];
            }
            if (!found) {
              adapterNotFound = true;
            }
            return found;
          });

        if (adapterNotFound) {
          throw new Error('The requested adapters have not been registered.');
        }
      }
    }

    const converter = (results: { [p: string]: unknown }[]): any => {
      // This is the default converter of the candidate results.
      // By using a recursive Proxy we can (fake) deep merge the result objects.
      if (results.every((r) => typeof r === 'object')) {
        const createResultProxy = (candidateObjects: { [p: string]: unknown }[]): unknown => {
          const target: { [k: string]: any } = {};
          candidateObjects.forEach(o => {
            for (const prop in o) {
              if (!target[prop]) {
                target[prop] = {};
              }
            }
          });
          return new Proxy(target, {
            get: (obj, prop: string) => {
              // Create an Array of all results that contain the property name.
              const matches: { [p: string]: unknown }[] = [];
              candidateObjects.forEach(o => {
                if (prop in o) {
                  matches.push(o);
                }
              });
              if (matches.length === 0) {
                // This property was not found on the result objects.
                return;
              }
              // If there's only one result object that contains the property name, return the property value.
              if (matches.length === 1) {
                if (typeof matches[0][prop] === 'function') {
                  return (matches[0][prop] as (...args: unknown[]) => unknown).bind(matches[0]);
                }
                return matches[0][prop];
              }
              // If all property values are objects, we have to (recursively) proxy these objects as well.
              const propValues = matches.map(o => o[prop]);
              if (propValues.every(v => typeof v === 'object')) {
                return createResultProxy(propValues as { [p: string]: unknown }[]);
              }
              // The property values cannot be merged, e.g. one is an object and the other is an Array or primitive.
              // In this case we return an Array containing the separate results.
              return propValues;
            }
          });
        };
        return createResultProxy(results);
      } else {
        return results;
      }
    };

    return this.createCallPathProxy(chain, adapters, augmentedResults, observableResults) as T;
  }


  // Polkadapt has an eventEmitter like event broadcast implementation to listen to events broadcasted from polkadapts internals.
  // It is not a native EventEmitter and it is not meant to be one.

  // Add listener function.
  addEventListener(eventName: string, listener: (...args: unknown[]) => any): void {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(listener);
  }

  on(eventName: string, listener: (...args: unknown[]) => any): void {
    this.addEventListener(eventName, listener);
  }

  // Remove listener for a specific event.
  removeListener(eventName: string, listener: (...args: unknown[]) => any): void {
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

  off(eventName: string, listener: (...args: unknown[]) => any): void {
    this.removeListener(eventName, listener);
  }

  // Remove all listeners for a specific event.
  removeAllListeners(eventName: string): void {
    delete this.eventListeners[eventName];
  }


  // Add listener that triggers only once and then removes itself.
  once(eventName: string, listener: (...args: unknown[]) => any): void {
    const onceListener = (...args: unknown[]) => {
      listener(...args);
      this.off(eventName, onceListener);
    };
    this.on(eventName, onceListener);
  }


  // Trigger handler function on event.
  emit(eventName: string, ...args: unknown[]): boolean {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      this.eventListeners[eventName].forEach((listener) => listener(...args));
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


  // Generate the proxy object that will return an Observable when the property is being called.
  private createCallPathProxy(chain: string | undefined,
                              adapters: PolkadaptRegisteredAdapter[],
                              augmentedResults: boolean,
                              observableResults: boolean
  ): () => void {
    const context: CallContext = {
      path: [],  // Contains the mirroring path of the method chain.
      called: false,  // Called will be true if the method chain is executed.
      callArgs: [],  // A list with the arguments passed to the call at execution.
    };

    // The actual observable returned to the application.
    const destroyer = new Subject<void>();
    const resultObservable = new Subject<unknown>();

    // Generate a Proxy element that will be returned while walking the call path at every step.
    // When a property is called (executed), we assume the path is complete and an Observable is returned.
    // In case the property is not called, the proxy will simply return itself. Eventually it will have to be called
    // in order to get information from the adapters.
    const proxy: () => void = new Proxy(
      () => {
      },
      {
        get: (obj, prop) => {
          // Add current step of the method chain to the mirroring path.
          context.path.push(prop.toString());
          // Return same proxy to make the next step available.
          return proxy;
        },
        apply: (target, thisArg, argArray) => {
          // Property is called.
          context.callArgs = argArray;
          context.called = true;
          let counter = 0;
          return resultObservable.pipe(
            shareReplay(),
            tap({
              subscribe: () => {
                counter += 1;
              },
              unsubscribe: () => {
                counter -= 1;
                if (counter === 0) {
                  destroyer.next();
                  destroyer.complete();
                }
              }
            }),
          );
        }
      }
    );

    // Asynchronously handle the path, whether it's been called, and which arguments were used. The resultObservable
    // will emit the values eventually.
    void this.processCallAsync(chain, adapters, context, resultObservable, destroyer, augmentedResults, observableResults);
    return proxy;
  }

  private async processCallAsync(chain: string | undefined,
                                 adapters: PolkadaptRegisteredAdapter[],
                                 context: CallContext,
                                 resultObservable: Subject<unknown>,
                                 destroyer: Subject<void>,
                                 augmentedResults: boolean,
                                 observableResults: boolean
  ): Promise<void> {
    const candidateIdentifiers: Map<AdapterBase, string[]> = new Map();  // Filled for matched method chains.
    const candidateResultObservables: Map<AdapterBase, Observable<unknown>> = new Map();  // Filled for matched method chains.

    type ItemRegistryEntry = {
      source: BehaviorSubject<{ [p: string]: unknown }> | unknown;
      returnObservable?: Observable<{ [p: string]: unknown }> | unknown;
    };
    type ItemRegistry = Map<string, ItemRegistryEntry | unknown>;

    const itemRegistry: ItemRegistry = new Map();
    const registryExpirationTimeout = 5 * 60 * 1000;

    let candidates: PolkadaptRegisteredAdapter[] = adapters;
    if (candidates.length === 0) {
      candidates = this.adapters;
    }

    // Determine the chain.
    if (!chain) {
      const possibleChains = new Set(candidates.map(a => a.instance.chain));
      if (possibleChains.size > 1) {
        resultObservable.error(new Error('Please supply chain argument, because adapters have been registered for multiple chains.'));
        return;
      } else {
        chain = [...possibleChains][0];
      }
    }

    // Now check if given adapters are all registered for this chain.
    if (adapters.length && adapters.some(a => !this.adapters.includes(a) || a.instance.chain && a.instance.chain !== chain)) {
      resultObservable.error(new Error('Adapter not registered for the supplied chain.'));
      return;
    }

    // Only use adapter instances for this chain.
    candidates = candidates.filter(a => !a.instance.chain || a.instance.chain === chain);

    try {
      await this.ready(candidates);
    } catch (e) {
      resultObservable.error(e);
      return;
    }

    // Array of matching items that contain functionality at the end of the call path.
    const candidateCalls: Map<AdapterBase, unknown> = new Map();
    // (items can be function or primitive or object)

    // Walk the call path for every adapter.
    for (const c of candidates) {
      let item = await c.instance.promise as { [p: string]: unknown };   /// TODO ???
      let pathFailed = false;

      for (const prop of context.path) {
        if (prop in item) {
          item = item[prop] as { [p: string]: unknown };
        } else {
          pathFailed = true;
        }
      }

      if (!pathFailed) {
        candidateCalls.set(c.instance, item);
      }
    }

    // If no items have been on the adapters method chains (paths).
    if (candidateCalls.size === 0) {
      resultObservable.error(new Error(`No adapters were found containing path ${context.path.join('.')}`));
      return;
    }

    // Method chain has execution on last item. It is called.
    if (context.called) {
      let identifiers: string[];
      let flattenedIdentifiers: string;

      Array.from(candidateCalls.entries()).forEach(([adapter, value], index) => {
        candidateIdentifiers.set(adapter, (value as FunctionWithIdentifiers).identifiers);
        if (index === 0) {
          identifiers = Array.isArray((value as FunctionWithIdentifiers).identifiers)
            ? (value as FunctionWithIdentifiers).identifiers
            : [];
          flattenedIdentifiers = identifiers.slice().sort().join();
        } else if (flattenedIdentifiers !== ((value as FunctionWithIdentifiers).identifiers || []).slice().sort().join()) {
          resultObservable.error(new Error('Identifiers do not match between adapter functions.'));
          return;
        }
      });

      candidateCalls.forEach((call, adapter) => {
        try {
          const result = (call as (...args: unknown[]) => Observable<unknown>)(...context.callArgs);
          candidateResultObservables.set(adapter, result);
        } catch (e) {
          // This candidate is not a function.
        }
      });

      if (candidateResultObservables.size === 0) {
        resultObservable.error(new Error(`No adapters were found containing path ${context.path.join('.')}`));
        return;
      } else {
        // Now we merge all candidate result observables into one stream and pass emissions to the resultObservable.
        merge(...Array.from(candidateResultObservables.values())).pipe(
          takeUntil(destroyer),
          map((result) => {
            // Here we process the actual result values that are coming from multiple sources.
            if (identifiers && identifiers.length) {
              const isObject = typeof result === 'object';
              const isArray = Array.isArray(result);

              if (isObject) {
                // Make sure result has properties for all identifiers.
                if (isArray) {
                  if (result.some(entry => !identifiers.every(attr => Object.keys(entry as object).includes(attr)))) {
                    resultObservable.error(new Error('Identifiers not set in at least one object'));
                    return;
                  }
                } else if (!identifiers.every(attr => Object.keys(result as object).includes(attr))) {
                  resultObservable.error(new Error('Identifiers not set in object'));
                  return;
                }
                if (observableResults) {
                  // Update or create an Observable for each identified object.
                  // Also for a single item, we temporarily make an Array for it.
                  const returnValues = (isArray ? result : [result]).map((item: { [p: string]: unknown }) => {
                    const pk = identifiers.map((attr) => item[attr]).join(' ');
                    let observable: BehaviorSubject<{ [p: string]: unknown }> | undefined;

                    const itemRegistryEntry = itemRegistry.get(pk);
                    if (itemRegistryEntry) {
                      observable = (itemRegistryEntry as ItemRegistryEntry).source as BehaviorSubject<{ [p: string]: unknown }>;
                    }

                    if (observable) {
                      // TODO Sanity check. If items are not in the same format, it cannot be merged.
                      if (augmentedResults) {
                        item = deepMerge(observable.value, item);
                      }
                      observable.next(item);
                      if (!isArray) {
                        // If result is not an Array, then return undefined, so the item Observable doesn't get emitted more than once.
                        return;
                      }
                    } else {
                      // Create a new observable for this item.
                      observable = new BehaviorSubject(item);
                      itemRegistry.set(pk, {source: observable});
                    }

                    if ((itemRegistryEntry as ItemRegistryEntry)?.returnObservable) {
                      return (itemRegistryEntry as ItemRegistryEntry).returnObservable;
                    } else {
                      const objObservable = observable.pipe(
                        takeUntil(destroyer),
                        tap({
                          complete: () => {
                            itemRegistry.delete(pk);
                          }
                        }),
                        shareReplay(1),
                      );
                      itemRegistry.set(pk, {source: observable, returnObservable: objObservable});

                      objObservable.pipe(
                        debounceTime(registryExpirationTimeout),
                        take(1)
                      ).subscribe(() => {
                        observable?.complete();
                      });
                      return objObservable;
                    }
                  });
                  // Return a single item if it was one in the first place.
                  return isArray ? returnValues : returnValues[0];
                } else if (augmentedResults) {
                  // Do not return result in an Observable, and emit every time with an updated version of each object.
                  const returnValues = (isArray ? result : [result]).map((item: { [p: string]: unknown }) => {
                    const pk = identifiers.map((attr) => item[attr]).join(' ');

                    const existing = itemRegistry.get(pk);
                    if (existing) {
                      // TODO Sanity check. If items are not in the same format, it cannot be merged.
                      item = deepMerge(existing, item);
                    }
                    itemRegistry.set(pk, item);
                    setTimeout(() => {
                      itemRegistry.delete(pk);
                    }, registryExpirationTimeout);
                    return item;
                  });
                  // Return a single item if it was one in the first place.
                  return isArray ? returnValues : returnValues[0];
                } else {
                  // Do not augment results.
                  return result;
                }
              } else {
                resultObservable.error(new Error('Result is not an object, though identifiers were set.'));
                return;
              }
            }

            if (observableResults) {
              // This result is not identifiable, so just return an updated Observable with the latest value.
              let observable: BehaviorSubject<unknown> | undefined;

              const itemRegistryEntry = itemRegistry.get('-');
              if (itemRegistryEntry) {
                observable = (itemRegistryEntry as ItemRegistryEntry).source as BehaviorSubject<unknown>;
              }

              if (observable) {
                observable.next(result);
                // Return undefined, so the Observable doesn't get emitted more than once.
                return;
              } else {
                observable = new BehaviorSubject<unknown>(result);
                itemRegistry.set('-', {source: observable});
              }

              if ((itemRegistryEntry as ItemRegistryEntry)?.returnObservable) {
                return (itemRegistryEntry as ItemRegistryEntry).returnObservable;
              } else {
                const primObservable = observable.pipe(
                  takeUntil(destroyer),
                  tap({
                    complete: () => {
                      itemRegistry.delete('-');
                    }
                  }),
                  shareReplay(1)
                );
                itemRegistry.set('-', {source: observable, returnObservable: primObservable});
                primObservable.pipe(
                  debounceTime(registryExpirationTimeout),
                  take(1)
                ).subscribe(() => {
                  observable?.complete();
                });
                return primObservable;
              }
            } else {
              return result;
            }
          }),
          filter(r => typeof r !== 'undefined')
        ).subscribe(resultObservable);
      }
    } else {
      resultObservable.error(new Error('End of call path, but it was not called.'));
    }
  }
}


export abstract class AdapterBase {
  chain: string;
  abstract name: string;
  abstract promise: AdapterPromise | undefined;

  protected constructor(chain: string) {
    this.chain = chain;
  }

  get guid(): string {
    return `${this.name}.${this.chain}`;
  }

  abstract get isReady(): Promise<boolean>;

  abstract connect(): void;

  abstract disconnect(): void;
}
