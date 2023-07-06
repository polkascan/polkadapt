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

import {
  BehaviorSubject,
  catchError,
  debounceTime,
  EMPTY,
  filter,
  map,
  merge,
  Observable,
  shareReplay,
  Subject,
  take,
  takeUntil,
  tap,
  throwError
} from 'rxjs';
import { deepMerge } from './helpers';

type PolkadaptRegisteredAdapter = {
  instance: AdapterBase;
};

type PolkadaptRunParamAdapters = (AdapterBase | string) | (AdapterBase | string)[];

export interface PolkadaptRunOptions {
  chain?: string;
  adapters?: PolkadaptRunParamAdapters;
  augment?: boolean;
  observableResults?: boolean;
}

export type PolkadaptRunArgument = string | PolkadaptRunOptions;

export type RecursiveObservableWrapper<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Observable<infer A extends any[]> ?
    (A extends Array<infer R> ? (...args: Parameters<T[K]>) => Observable<Observable<R>[]> : never) :
    T[K] extends (...args: any[]) => Observable<infer R> ?
      (...args: Parameters<T[K]>) => Observable<Observable<R>> :
      RecursiveObservableWrapper<T[K]>;
};

export type AdapterApiCallWithIdentifiers<A extends any[] = any[], T = any> = {
  (...args: A): Observable<T>;
  identifiers?: string[];
};

export type AdapterApi = {
  [name: string]: AdapterApiCallWithIdentifiers | AdapterApi;
};

type CallContext = {
  path: string[];
  called: boolean;
  callArgs: unknown[];
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

  // Run is the entrypoint for the application that starts the method chain and will return a result or create a subscription triggering
  // a passed through callback.
  run<P extends PolkadaptRunArgument>(config?: P): P extends {
    observableResults: false;
  } ? T : RecursiveObservableWrapper<T> {
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

    return this.createCallPathProxy(chain, adapters, augmentedResults, observableResults
    ) as P extends { observableResults: false } ? T : RecursiveObservableWrapper<T>;
  }

  // Generate the proxy object that will return an Observable when the property is being called.
  private createCallPathProxy(chain: string | undefined,
                              adapters: PolkadaptRegisteredAdapter[],
                              augmentedResults: boolean,
                              observableResults: boolean
  ) {
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
        // Just a target function.
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
    setTimeout(() => {
      this.processCallAsync(chain, adapters, context, resultObservable, destroyer, augmentedResults, observableResults);
    }, 0);
    return proxy;
  }

  private processCallAsync(chain: string | undefined,
                           adapters: PolkadaptRegisteredAdapter[],
                           context: CallContext,
                           resultObservable: Subject<unknown>,
                           destroyer: Subject<void>,
                           augmentedResults: boolean,
                           observableResults: boolean
  ): void {
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

    // Array of matching items that contain functionality at the end of the call path.
    const candidateCalls: Map<AdapterBase, AdapterApiCallWithIdentifiers> = new Map();
    // (items can be function or primitive or object)

    // Walk the call path for every adapter.
    for (const c of candidates) {
      let item: AdapterApi | AdapterApiCallWithIdentifiers = c.instance.api;
      let pathFailed = false;

      for (const prop of context.path) {
        if (prop in item) {
          item = item[prop] as AdapterApi;
        } else {
          pathFailed = true;
        }
      }

      if (!pathFailed && typeof item === 'function') {
        candidateCalls.set(c.instance, item as AdapterApiCallWithIdentifiers);
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

      Array.from(candidateCalls.values()).forEach((call, index) => {
        if (index === 0) {
          identifiers = Array.isArray(call.identifiers) ? call.identifiers : [];
          flattenedIdentifiers = identifiers.slice().sort().join();
        } else if (flattenedIdentifiers !== (call.identifiers || []).slice().sort().join()) {
          resultObservable.error(new Error('Identifiers do not match between adapter functions.'));
          return;
        }
      });

      candidateCalls.forEach((call, adapter) => {
        try {
          const result = call(...context.callArgs);
          candidateResultObservables.set(adapter, result);
        } catch (e) {
          // This candidate is not a function.
        }
      });

      if (candidateResultObservables.size === 0) {
        resultObservable.error(new Error(`No adapters were found containing path ${context.path.join('.')}`));
        return;
      } else {
        const errorsPerObservable = new Map<number, any>();
        const observables = Array.from(candidateResultObservables.values()).map(
          (obs, i) => obs.pipe(
            catchError((err) => {
              console.error(err);
              errorsPerObservable.set(i, err);
              if (errorsPerObservable.size === observables.length) {
                // All observables are in error state. Throw all errors at once.
                return throwError(() => new Error(Array.from(errorsPerObservable.values())
                  .map((e: Error) => e && e.message ? e.message : e)
                  .join('\n')));
              }

              // Return an empty completed observable to prevent a rxjs merge from completing/throwing
              // when not all observables are in error state.
              return EMPTY;
            })
          )
        );

        // Now we merge all candidate result observables into one stream and pass emissions to the resultObservable.
        merge(...observables).pipe(
          takeUntil(destroyer),
          map((result) => {
            // Here we process the actual result values that are coming from multiple sources.
            if (identifiers && identifiers.length) {
              const isObject = typeof result === 'object' && result !== null;
              const isArray = Array.isArray(result);

              if (isObject) {
                // Make sure result has properties for all identifiers.
                if (isArray) {
                  if (result.some(entry => !identifiers.every(attr => Object.keys(entry as object).includes(attr)))) {
                    resultObservable.error(new Error('Identifiers not set in at least one object'));
                    return;
                  }
                } else if (!identifiers.every(attr => Object.keys(result).includes(attr))) {
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
                      observable = (itemRegistryEntry as ItemRegistryEntry).source as BehaviorSubject<{
                        [p: string]: unknown;
                      }>;
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
                      ).subscribe({
                        next: () => {
                          observable?.complete();
                        }
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
              } else if (result !== null) {
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
                ).subscribe({
                  next: () => {
                    observable?.complete();
                  }
                });
                return primObservable;
              }
            } else {
              return result;
            }
          }),
          filter(r => typeof r !== 'undefined')
        ).subscribe({
          next: (v) => resultObservable.next(v),
          error: (e) => resultObservable.error(e),
          complete: () => {
            itemRegistry.forEach((item: ItemRegistryEntry | unknown) => {
              if (item && (item as ItemRegistryEntry).source instanceof Subject) {
                ((item as ItemRegistryEntry).source as BehaviorSubject<any>).complete();
              }
            });
            resultObservable.complete();
          }
        });
      }
    } else {
      resultObservable.error(new Error('End of call path, but it was not called.'));
    }
  }
}


export abstract class AdapterBase {
  chain: string;
  abstract name: string;
  abstract api: AdapterApi;

  protected constructor(chain: string) {
    this.chain = chain;
  }

  get guid(): string {
    return `${this.name}.${this.chain}`;
  }

  connect(): void {
    // This is called as soon as it's registered. You may implement this for your own purposes, e.g. initialization.
    // We don't wait for anything coming out of this, however.
  }

  disconnect(): void {
    // This is called when it's unregistered. You may implement this if you want your adapter to disconnect or clean up.
  }
}
