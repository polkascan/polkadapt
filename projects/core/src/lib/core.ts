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

export enum PolkadaptEventNames {
  readyChange = 'readyChange'
}

export type AdapterPromise = Promise<any>;

//
// Polkadapt class
//
// To use polkadapt, start by creating a polkadapt instance.
// usage:      new Polkadapt()
//
// Typescript typings will be available by using the adapters exposed Api type.
// Typescript example:
//             const pa: Polkadapt<substrate.Api> = new Polkadapt()                    // Single adapter
//             const pa: Polkadapt<substrate.Api & polkascan.Api> = new Polkadapt()    // Multiple adapters
//
// Registering adapter instances in Polkadapt.
//             pa.register(adapter1, adapter2)
//
// Run adapters calls. Just use the run function and then use the call stack like you would use polkadotJs. Other
// adapters can share or have similar method chains that will return (combined) data. example:
//             pa.run('kusama').query.council.members()
//
export class Polkadapt<T> {
  public adapters: {
    instance: AdapterBase,
    entrypoint: any
  }[] = [];

  addListener = this.on;
  off = this.removeListener;

  private isReady = false;
  private eventListeners: { [eventName: string]: ((...args) => any)[] } = {};


  // Registers adapters in the polkadapt instance.
  // usage:      pa.register(adapter1, adapter2)
  register(...adapters: AdapterBase[]): void {
    for (const adapter of adapters) {
      const duplicate = this.adapters.find(a => a.instance === adapter);
      if (!duplicate) {
        adapter.connect();
        this.adapters.push({instance: adapter, entrypoint: null});
      }
    }
    this.isReady = false;
    this.emit('readyChange', this.isReady);
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
  async ready(): Promise<boolean> {
    if (this.isReady) {
      return true;
    }

    if (this.adapters.length === 0) {
      throw new Error('No registered adapter instances in this Polkadapt instance. Please create adapter instances and register them by calling register(...adapters) on the Polkadapt instance.');
    }

    // Wait for all adapters to be ready.
    const entrypoints: any[] = await Promise.all(this.adapters.map(a => a.instance.promise));
    // All adapters ready, store the entrypoints per adapter.
    this.adapters.forEach((a, index) => {
      a.entrypoint = entrypoints[index];
    });

    this.isReady = true;
    this.emit('readyChange', this.isReady);
    return true;
  }


  // Generate the proxy object that will return a promise on execution.
  private createRecursiveProxy(chain: string, converter: (results) => any): any {
    const path: string[] = [];  // Contains the mirroring path of the method chain.
    const candidateReturnValues = [];  // Array of promises for every adapter that matches the method chain.
    let called = false;  // Called will be true if the method chain is executed.
    let callArgs;  // A list with the arguments passed to the call at execution.
    let callback: (...attrs: any) => any;  // The user passed callback function to be executed when subscriptions emit.
    const candidateMessages = new Map();  // Messages storage per subscription. (enables combine latest)
    let unsubscribeFunctions: (() => any)[];  // Storage for all the unsubscribe functions for active subscriptions.

    // This interceptor returns a function that will store the received subscription messages for a candidate.
    // A combined result from all candidates will be used as the value for the given callback function.
    const callbackInterceptor = (subscription: any) => {
      return (message: any) => {
        // Message received, store (or overwrite the previous) message.
        candidateMessages.set(subscription, message);

        // Place all adapter messages from the Map in an array.
        const messages = [];
        candidateMessages.forEach((value) => {
          messages.push(value);
        });

        // Convert messages and execute the user passed callback function with the result.
        if (candidateMessages.size === candidateReturnValues.length) {
          callback(converter(messages));
        }
      };
    };

    // Polkadapt will return this unsubscribe function when it's promise is resolved in the client application. Every
    // adapter that has a subscription running will get unsubscribed.
    const unsubscribeAll = () => {
      unsubscribeFunctions.forEach((ufn) => ufn());
    };

    // The actual promise returned to the application containing data or unsubscribe functionality.
    const resultPromise = new Promise<any>((resolve, reject) => {
      this.ready().then(
        () => {
          // Get entrypoints for each adapter.
          const candidates = this.adapters.filter(a =>
            !a.instance.chain || (Object.prototype.toString.call(a.instance.chain) === '[object String]' && chain === a.instance.chain)
          ).map(a => a.entrypoint);

          const candidateItems = [];  // Array of matching items that contain functionality at the end of the method chain.
          // (items can be function or primitive or object)

          // Walk the chain path for every adapter.
          for (const c of candidates) {
            let item = c;
            let pathFailed = false;

            for (const prop of path) {
              if (prop in item) {
                item = item[prop];
              } else {
                pathFailed = true;
              }
            }

            if (!pathFailed) {
              candidateItems.push(item);
            }
          }

          // If no items have been on the adapters method chains (paths) then reject the promise.
          if (candidateItems.length === 0) {
            reject();
            return;
          }

          // Method chain has execution on last item. It is called.
          if (called) {
            candidateItems.forEach(item => {
              try {
                const result = item(...callArgs.map((arg: any) => {
                  if (typeof arg === 'function') {
                    // Set candidate in interceptor callback function.
                    return arg(item);
                  } else {
                    return arg;
                  }
                }));
                candidateReturnValues.push(result);
              } catch (e) {
                // This candidate is not a function.
              }
            });

            if (candidateReturnValues.length === 0) {
              reject(`No adapters were found containing path ${path.join('.')}`);

            } else if (candidateReturnValues.length === 1) {
              candidateReturnValues[0].then((returnValue) => {
                if (typeof returnValue === 'function') {
                  unsubscribeFunctions = [returnValue];
                  // Callbacks will be triggered, return an unsubscribe all function.
                  resolve(unsubscribeAll);
                } else {
                  resolve(returnValue);
                }
              }, reject);
            } else {
              Promise.all(candidateReturnValues).then(
                (returnValues) => {
                  // Check if a return value is a unsubscribe function. If so we have a subscription.
                  unsubscribeFunctions = returnValues.filter((rv) => typeof rv === 'function');

                  if (unsubscribeFunctions.length > 0) {
                    returnValues.forEach((rv, index) => {
                      if (typeof rv !== 'function') {
                        // Add result, no need to store the candidate
                        candidateMessages.set(index, rv);
                      }
                    });
                    // Callbacks will be triggered, return an unsubscribe all function.
                    resolve(unsubscribeAll);
                  } else {
                    resolve(converter(returnValues));
                  }
                },
                (errors: any) => {
                  // Check if subscriptions were made. Unsubscribe immediately.
                  candidateReturnValues.forEach((rv) => {
                    rv.then((returnValue) => {
                      if (typeof returnValue === 'function') {
                        returnValue();
                      }
                    }, () => {
                    });
                  });

                  reject(errors);
                });
            }

          } else {
            // Last item of method chain has not been called, return candidate items. The application can do whatever with it.
            resolve(candidateItems);
          }
        },
        () => {
        });
    });

    // Generate a Proxy element that will be returned while walking the method chain at every step.
    // When a method is called (executed) we assume the chain is complete and a promise is returned.
    // In case no method is called the proxy will simply return itself. Eventually it will have to be called sometime
    // in order to get information from the adapters.
    const proxy = new Proxy(
      () => {
      },
      {
        get: (obj, prop) => {
          // Add current step of the method chain to the mirroring path.
          path.push(prop.toString());
          // Return same proxy to make the next step available.
          return proxy;
        },
        apply: (target, thisArg, argArray) => {
          // Method is called.
          called = true;
          // Store arguments passed by the application. (Possibly includes a callback function as last argument)
          callArgs = argArray;

          // Find the callback function in the call arguments and store it. Replace it by callback interceptor.
          callArgs.forEach((arg, index) => {
            if (!callback && typeof arg === 'function') {
              // Store passed callback function.
              callback = arg;
              // Replace callback function with interceptor (that combines multiple adapter results).
              callArgs[index] = callbackInterceptor;
            }
          });

          // Return promise that will be resolved in the next browser cycle.
          return resultPromise;
        }
      }
    );

    // First method of the method chain. Return generated proxy.
    return proxy;
  }


  // Run is the entrypoint for the application that starts the method chain and will return a result or create a subscription triggering
  // a passed through callback.
  run(chain: string, converter?: (results: any) => any): T {
    if (!converter) {
      converter = (results: any[]): any => {
        // This is the default converter of the candidate results.
        // By using a recursive Proxy we can (fake) deep merge the result objects.
        console.log(results);
        if (results.every((r) => typeof r === 'object')) {
          const createResultProxy = (candidateObjects) => {
            const target = {};
            candidateObjects.forEach(o => {
              for (const prop in o) {
                if (!target[prop]) {
                  target[prop] = {};
                }
              }
            });
            return new Proxy(target, {
              get: (obj, prop) => {
                // Create an Array of all results that contain the property name.
                const matches = [];
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
                    return matches[0][prop].bind(matches[0]);
                  }
                  return matches[0][prop];
                }
                // If all property values are objects, we have to (recursively) proxy these objects as well.
                const propValues = matches.map(o => o[prop]);
                if (propValues.every(v => typeof v === 'object')) {
                  return createResultProxy(propValues);
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
    }

    return this.createRecursiveProxy(chain, converter);
  }


  // Polkadapt has an eventEmitter like event broadcast implementation to listen to events broadcasted from polkadapts internals.
  // It is not a native EventEmitter and it is not meant to be one.

  // Add listener function.
  on(eventName: string, listener: (...args) => any): void {
    if (!this.eventListeners.hasOwnProperty(eventName)) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(listener);
  }


  // Remove listener for a specific event.
  removeListener(eventName: string, listener: (...args) => any): void {
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
  removeAllListeners(eventName: string): void {
    delete this.eventListeners[eventName];
  }


  // Add listener that triggers only once and then removes itself.
  once(eventName: string, listener: (...args) => any): void {
    const onceListener = (...args) => {
      listener(...args);
      this.off(eventName, onceListener);
    };
    this.on(eventName, onceListener);
  }


  // Trigger handler function on event.
  emit(eventName: string, ...args): boolean {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      this.eventListeners[eventName].forEach((listener) => listener(...args));
      return true;
    }
    return false;
  }


  // Get a list of all event names with active listeners.
  eventNames(): string[] {
    const eventNames = [];
    Object.keys(this.eventListeners).forEach((key) => {
      if (this.eventListeners[key] && this.eventListeners[key].length) {
        eventNames.push(key);
      }
    });
    return eventNames;
  }


  // Return all listeners registered on an event.
  listeners(eventName: string): ((...args) => any)[] {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      return this.eventListeners[eventName];
    } else {
      return [];
    }
  }
}


export abstract class AdapterBase {
  chain: string;
  abstract name: string;
  abstract promise: AdapterPromise;

  private polkadaptRegistry: Map<Polkadapt<any>, string> = new Map();

  constructor(chain: string) {
    this.chain = chain;
  }

  abstract connect(): void;

  abstract disconnect(): void;

  public registerPolkadapt(polkadapt: Polkadapt<any>): void {
    if (this.polkadaptRegistry.has(polkadapt)) {
      throw new Error(`Adapter ${this.name} for ${this.chain} has already been registered in current Polkadapt.`);
    }

    if (this.polkadaptRegistry.size === 0) {
      this.connect();
    }
    this.polkadaptRegistry.set(polkadapt, this.guid);
  }

  public unregisterPolkadapt(polkadapt: Polkadapt<any>): void {
    if (!this.polkadaptRegistry.has(polkadapt)) {
      throw new Error(`Adapter ${this.name} for ${this.chain} has not been registered in current Polkadapt.`);
    }

    this.polkadaptRegistry.delete(polkadapt);

    if (this.polkadaptRegistry.size === 0) {
      this.disconnect();
    }
  }

  get guid(): string {
    return `${this.name}.${this.chain}`;
  }
}
