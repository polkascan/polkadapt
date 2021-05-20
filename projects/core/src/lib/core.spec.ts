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

import { AdapterBase, Polkadapt } from './core';

const chainName = 'test chain';

class TestAdapterBase extends AdapterBase {
  name = 'test adapter';
  promise: Promise<any>;
  letter: string | undefined;
  timeout: number | undefined;
  api: any;

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }

  constructor() {
    super(chainName);
    this.api = {
      values: {
        successFromBoth: async () => {
          const obj: any = {
            nested: {
              conflicted: this.letter,
            }
          };
          obj.nested[this.letter as string] = true;
          return Promise.resolve(obj);
        }
      },
      subscriptions: {
        successFromBoth: async (callback: any) => {
          // Start subscription.
          let i = 0;
          const interval = setInterval(() => {
            // Pass every subscription event/message to the callback function.
            const obj: any = {
              nested: {
                conflicted: (this.letter as string) + i,
              }
            };
            obj.nested[this.letter as string] = i;
            callback(obj);
            i += 1;
          }, this.timeout);
          // Return unsubscribe function.
          return () => {
            clearInterval(interval);
          };
        }
      }
    };
    this.promise = Promise.resolve(this.api);
  }

  connect(): void {
  }

  disconnect(): void {
  }
}

class TestAdapterA extends TestAdapterBase {
  name = 'test adapter A';
  letter = 'a';
  timeout = 100;

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }

  constructor() {
    super();
    this.api.values.successFromA = async () => Promise.resolve('a');
    this.api.values.partialFailure = this.api.values.successFromA;
    this.api.subscriptions.successFromA = async (callback: any) => {
      // Start subscription.
      let i = 0;
      const interval = setInterval(() => {
        // Pass every subscription event/message to the callback function.
        callback({a: i});
        i += 1;
      }, 100);
      // Return unsubscribe function.
      return () => {
        clearInterval(interval);
      };
    };
    this.api.subscriptions.partialFailure = this.api.subscriptions.successFromA;
  }
}

class TestAdapterB extends TestAdapterBase {
  name = 'test adapter B';
  letter = 'b';
  timeout = 150;

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }

  constructor() {
    super();
    this.api.values.successFromB = async () => Promise.resolve('b');
    this.api.values.failureFromB = async () => Promise.reject('whatever');
    this.api.values.partialFailure = this.api.values.failureFromB;
    this.api.subscriptions.failureFromB = async (callback: any) => {
      // Start subscription.
      let i = 0;
      const interval = setInterval(() => {
        // Pass every subscription event/message to the callback function.
        if (i === 4) {
          throw new Error('Error!');
        }
        callback({b: i});
        i += 1;
      }, 150);
      // Return unsubscribe function.
      return () => {
        clearInterval(interval);
      };
    };
    this.api.subscriptions.partialFailure = this.api.subscriptions.failureFromB;
  }
}

class TestAdapterC extends TestAdapterBase {
  name = 'test adapter C';

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('Polkadapt', () => {
  let pa: Polkadapt<any>;

  beforeEach(() => {
    pa = new Polkadapt();
    const adapter1 = new TestAdapterA();
    const adapter2 = new TestAdapterB();
    spyOn(adapter1, 'connect');
    spyOn(adapter2, 'connect');
    pa.register(adapter1, adapter2);
  });

  afterEach(() => {
    pa.unregister();
    pa.removeAllListeners('readyChange');
  });

  it('should register adapters.', async () => {
    expect(pa.adapters.length).toBe(2);
    expect(pa.adapters[0].instance.connect).toHaveBeenCalled();
    expect(pa.adapters[1].instance.connect).toHaveBeenCalled();
  });

  it('should register an adapter at a later moment', async () => {
    const adapter3 = new TestAdapterC();
    spyOn(adapter3, 'connect');
    pa.register(adapter3);
    expect(pa.adapters.length).toBe(3);
    expect(pa.adapters[2].instance.connect).toHaveBeenCalled();
  });

  it('should not be able to register the same adapter instance multiple times', async () => {
    const adapter3 = new TestAdapterC();
    spyOn(adapter3, 'connect');
    pa.register(adapter3, adapter3);
    pa.register(adapter3);
    expect(pa.adapters.length).toBe(3);
    expect(pa.adapters[2].instance).toBe(adapter3);
    expect(pa.adapters[1].instance).not.toBe(adapter3);
    expect(adapter3.connect).toHaveBeenCalledTimes(1);
  });

  it('should unregister one adapter', async () => {
    const adapter1 = pa.adapters[0].instance;
    spyOn(adapter1, 'disconnect');
    pa.unregister(adapter1);
    expect(adapter1.disconnect).toHaveBeenCalled();
    expect(pa.adapters.length).toBe(1);
  });

  it('should unregister all adapters', async () => {
    const [adapter1, adapter2] = pa.adapters.map(a => a.instance);
    spyOn(adapter1, 'disconnect');
    spyOn(adapter2, 'disconnect');
    pa.unregister();
    expect(adapter1.disconnect).toHaveBeenCalled();
    expect(adapter2.disconnect).toHaveBeenCalled();
    expect(pa.adapters.length).toBe(0);
  });

  it('should not be ready until all registered adapters have initialized.', async () => {
    const readyStateHandler = jasmine.createSpy('readyStateHandler');
    pa.once('readyChange', readyStateHandler);
    expect(readyStateHandler).not.toHaveBeenCalled();
    expect(pa.ready()).toBeInstanceOf(Promise);
    expect(await pa.ready()).toBeTrue();
    expect(readyStateHandler).toHaveBeenCalledWith(true);
  });

  it('should not be ready anymore when an extra adapter is registered until initialized.', async () => {
    await pa.ready();
    const readyStateHandler = jasmine.createSpy('readyStateHandler');
    pa.on('readyChange', readyStateHandler);
    const adapter3 = new TestAdapterC();
    pa.register(adapter3);
    expect(readyStateHandler).toHaveBeenCalledWith(false);
    expect(await pa.ready()).toBeTrue();
    expect(readyStateHandler).toHaveBeenCalledWith(true);
  });

  xit('should reject ready when an adapter encounters a connection error');

  it('should return a Promise when an adapter API is called.', async () => {
    const valuePromise = pa.run({chain: chainName}).values.successFromA();
    const functionPromise = pa.run({chain: chainName}).subscriptions.successFromA(() => {
    });
    expect(valuePromise).toBeInstanceOf(Promise);
    expect(functionPromise).toBeInstanceOf(Promise);
    const unsubscribe = await functionPromise;
    unsubscribe();
  });

  it('should wait until ready before an API call is processed.', async () => {
    // Here we don't explicitly await pa.ready() and expect the API call to do this instead.
    const readyStateHandler = jasmine.createSpy('readyStateHandler');
    pa.once('readyChange', readyStateHandler);
    const valuePromise = pa.run({chain: chainName}).values.successFromBoth();
    expect(readyStateHandler).not.toHaveBeenCalled();
    await valuePromise;
    expect(readyStateHandler).toHaveBeenCalledWith(true);
  });

  it('should return the Promise result of one adapter.', async () => {
    expect(await pa.run({chain: chainName}).values.successFromA()).toEqual('a');
  });

  it('should deep merge the Promise result of multiple adapters.', async () => {
    const result = await pa.run({chain: chainName}).values.successFromBoth();
    expect(result).toEqual({
      nested: {
        conflicted: ['a', 'b'],
        a: true,
        b: true
      }
    });
  });

  it('should reject when one adapter rejects.', async () => {
    let status;
    try {
      await pa.run({chain: chainName}).values.failureFromB();
      status = true;
    } catch (error) {
      status = false;
    }
    expect(status).toBeFalse();
  });

  xit('should reject when one adapter throws an error.');

  it('should reject when one of multiple adapters rejects.', async () => {
    let status;
    try {
      await pa.run({chain: chainName}).values.partialFailure();
      status = true;
    } catch (error) {
      status = false;
    }
    expect(status).toBeFalse();
  });

  xit('should reject when one of multiple adapters throws an error.');

  xit('should return the callback result for a subscription in one adapter.');
  xit('should return the callback for every emitted result for subscriptions in multiple adapters.');
  xit('should deep merge the callback values for a subscription in multiple adapters. (merge)');
  xit('should wait for deep merge when all adapters returned results (combineLatest).');
  xit('should deep merge the callback values for a subscription in one adapter and Promise result in another.');
  xit('should make an Array of the callback values if one of multiple is not an Object.');
  xit('should unsubscribe one adapter');
  xit('should unsubscribe multiple adapters.');
  xit('should unsubscribe multiple adapters when one adapter throws an error.');
  xit('should unsubscribe multiple adapters after unregister.');
  xit('should be clear which adapter threw an error.');

  it('should be able to run with a specific adapter', async () => {
    expect(await pa.run({chain: chainName, adapters: 'test adapter A'}).values.successFromA()).toEqual('a');
    expect(await pa.run({chain: chainName, adapters: ['test adapter A']}).values.successFromA()).toEqual('a');
    expect(await pa.run({chain: chainName, adapters: pa.adapters[0].instance}).values.successFromA()).toEqual('a');
    expect(await pa.run({chain: chainName, adapters: [pa.adapters[0].instance]}).values.successFromA()).toEqual('a');
    expect(await pa.run({chain: chainName, adapters: 'test adapter B'}).values.successFromB()).toEqual('b');
    expect(await pa.run({chain: chainName, adapters: pa.adapters[1].instance}).values.successFromB()).toEqual('b');
  });

  it('should be able to run with multiple specified adapters', async () => {
    const result = await pa.run({chain: chainName, adapters: [pa.adapters[0].instance, 'test adapter B']}).values.successFromBoth();
    expect(result).toEqual({
      nested: {
        conflicted: ['a', 'b'],
        a: true,
        b: true
      }
    });
  });

  it('should fail when specified adapters are not registered', async () => {
    const adapterA = pa.adapters[0].instance;
    pa.unregister(adapterA);

    try {
      await pa.run({chain: chainName, adapters: 'test adapter A'}).values.successFromA();
    } catch (e) {
      expect(e.message).toEqual('The requested adapters have not been registered.');
    }

    try {
      await pa.run({chain: chainName, adapters: adapterA}).values.successFromA();
    } catch (e) {
      expect(e.message).toEqual('The requested adapters have not been registered.');
    }

    // todo include not for a specified chain
  });

  // Adapter tests.
  xit('should have a "name" property containing a name.');
  xit('should have a "chain" property containing a name.');
  xit('should have a "promise" property containing the Promise to the adapter API.');

  // Event listeners tests.
  it('should add a listener', async () => {
    const listener = jasmine.createSpy('listener', () => {
    });
    pa.on('readyChange', listener);
    const listeners = pa.listeners('readyChange');
    expect(listeners.length).toBe(1);
    expect(listeners[0]).toBe(listener);
  });

  it('should emit an event', async () => {
    const listener = jasmine.createSpy('listener');
    pa.on('readyChange', listener);
    pa.emit('readyChange');
    expect(listener).toHaveBeenCalled();
  });

  it('should execute listeners when event emit', async () => {
    const listenerA = jasmine.createSpy('listenerA');
    const listenerB = jasmine.createSpy('listenerB');
    pa.on('readyChange', listenerA);
    pa.on('readyChange', listenerB);
    expect(listenerA).toHaveBeenCalledTimes(0);
    expect(listenerB).toHaveBeenCalledTimes(0);
    pa.emit('readyChange', 'test1', 'test2', 'test3');
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA).toHaveBeenCalledWith('test1', 'test2', 'test3');
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledWith('test1', 'test2', 'test3');
    pa.emit('readyChange', 'test4');
    expect(listenerA).toHaveBeenCalledTimes(2);
    expect(listenerA).toHaveBeenCalledWith('test4');
    expect(listenerB).toHaveBeenCalledTimes(2);
    expect(listenerB).toHaveBeenCalledWith('test4');
  });

  it('should add a listener that removes itself after event emits', async () => {
    const listener = jasmine.createSpy('listener');
    pa.once('readyChange', listener);
    pa.emit('readyChange');
    pa.emit('readyChange');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should remove a listener', async () => {
    const listener = jasmine.createSpy('listener');
    pa.on('readyChange', listener);
    pa.emit('readyChange');
    expect(listener).toHaveBeenCalledTimes(1);
    pa.off('readyChange', listener);
    pa.emit('readyChange');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should remove all listener (per event name)', async () => {
    const listener = jasmine.createSpy('listener');
    pa.on('readyChange', listener);
    pa.emit('readyChange');
    expect(listener).toHaveBeenCalledTimes(1);
    pa.removeAllListeners('readyChange');
    pa.emit('readyChange');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should return all listeners registered for an event name', async () => {
    const listenerA = () => {};
    const listenerB = () => {};
    pa.on('readyChange', listenerA);
    pa.on('readyChange', listenerB);
    const listeners = pa.listeners('readyChange');
    expect(listeners).toContain(listenerA);
    expect(listeners).toContain(listenerB);
  });

  it('should return all event names with registered listeners', async () => {
    const listener = () => {};
    pa.on('readyChange', listener);
    const eventNames = pa.eventNames();
    expect(eventNames).toContain('readyChange');
  });
});
