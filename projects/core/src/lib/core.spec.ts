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

import { AdapterBase, Polkadapt } from './core';
import {
  combineLatestWith,
  delay,
  interval,
  map,
  Observable,
  of,
  Subject, switchAll, switchMap,
  take,
  takeUntil,
  tap,
  throwError, timer
} from 'rxjs';

type ApiCall = (() => Observable<unknown>) & {identifiers?: string[]};
type PolkadaptObservableCall = () => Observable<Observable<unknown>>;
type PolkadaptObjectCall = () => Observable<unknown>;

type TestApi = {
  values: {
    objectFromBoth: ApiCall;
    arrayFromBoth: ApiCall;
    successFromA?: ApiCall;
    successFromB?: ApiCall;
    failureFromB?: ApiCall;
    partialFailure?: ApiCall;
  };
  subscriptions: {
    newObjectFromBoth: ApiCall;
    newArrayFromBoth: ApiCall;
    successFromA?: ApiCall;
    failureFromB?: ApiCall;
    partialFailure?: ApiCall;
    streamFromA: {
      selfChangingProperties?: ApiCall;
      withoutIdentifiers?: ApiCall;
      increasingIdentifiers?: ApiCall;
    };
    streamFromBoth: {
      selfChangingProperties?: ApiCall;
      withoutIdentifiers?: ApiCall;
      increasingIdentifiers?: ApiCall;
      identifiersFailure?: ApiCall;
    };
  };
};

const chainName = 'test chain';

class TestAdapterBase extends AdapterBase {
  name = 'test adapter';
  promise: Promise<any>;
  letter: string;
  timeout: number;
  api: TestApi;

  constructor() {
    super(chainName);
    this.api = {
      values: {
        objectFromBoth: () => {
          const obj = {
            id: 1,
            nested: {
              conflicted: this.letter,
            }
          };
          (obj.nested as { [p: string]: any })[this.letter] = true;
          return of(obj);
        },
        arrayFromBoth: () => {
          const arr: {[p: string]: any}[] = [{id: 1}, {id: 2}, {id: 3, same: (this.letter === 'a')}];
          arr[0][this.letter] = true;
          arr[1][this.letter] = false;
          return of(arr).pipe(delay(this.letter === 'a' ? 0 : this.timeout));
        }
      },
      subscriptions: {
        newObjectFromBoth: () => interval(this.timeout).pipe(
          map(i => {
            const obj = {
              id: i,
              nested: {
                conflicted: this.letter + i.toString(),
              }
            };
            (obj.nested as { [p: string]: any })[this.letter] = i;
            return obj;
          })
        ),
        newArrayFromBoth: () =>
          interval(this.timeout).pipe(
            delay(this.letter === 'a' ? 0 : this.timeout),
            map((i) => {
              const arr: {[p: string]: any}[] = [{id: 1}, {id: 2}, {id: 3, same: (this.letter === 'a')}];
              arr[0][this.letter] = i;
              arr[1][this.letter] = i;
              return arr;
          })),
        streamFromA: {},
        streamFromBoth: {}
      }
    };
    this.api.values.objectFromBoth.identifiers = ['id'];
    this.api.values.arrayFromBoth.identifiers = ['id'];
    this.promise = Promise.resolve(this.api);
  }

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
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

  constructor() {
    super();
    this.api.values.successFromA = () => of('a');
    this.api.values.partialFailure = this.api.values.successFromA;
    this.api.subscriptions.successFromA = () => interval(this.timeout).pipe(
      map(i => ({a: i}))
    );
    this.api.subscriptions.partialFailure = this.api.subscriptions.successFromA;

    const streamA = interval(this.timeout).pipe(
      map(i => ({id1: '1', id2: '2', i, a: 'a'}))
    );
    const streamAFn = () => streamA;
    streamAFn.identifiers = ['id1', 'id2'];
    this.api.subscriptions.streamFromA.selfChangingProperties = streamAFn;
    this.api.subscriptions.streamFromBoth.selfChangingProperties = streamAFn;
    this.api.subscriptions.streamFromBoth.identifiersFailure = streamAFn;
    this.api.subscriptions.streamFromA.withoutIdentifiers = () => streamA;
    this.api.subscriptions.streamFromBoth.withoutIdentifiers = () => streamA;

    const streamAIncreasing = () => interval(this.timeout).pipe(
      map(i => ({id: Math.floor(i / 4), i, a: 'a'}))
    );
    streamAIncreasing.identifiers = ['id'];
    this.api.subscriptions.streamFromA.increasingIdentifiers = streamAIncreasing; // removes the identifiers
    this.api.subscriptions.streamFromBoth.increasingIdentifiers = streamAIncreasing; // removes the identifiers
  }

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class TestAdapterB extends TestAdapterBase {
  name = 'test adapter B';
  letter = 'b';
  timeout = 150;

  constructor() {
    super();
    this.api.values.successFromB = () => of('b');
    this.api.values.failureFromB = () => throwError(() => new Error('Whatever'));
    this.api.values.partialFailure = this.api.values.failureFromB;
    this.api.subscriptions.failureFromB = () => interval(this.timeout).pipe(
      map(i => {
        if (i === 4) {
          throw new Error('Error!');
        }
        return {b: i};
      })
    );
    this.api.subscriptions.partialFailure = this.api.subscriptions.failureFromB;

    const streamB = interval(this.timeout).pipe(
      delay(this.timeout / 2),
      map(i => ({id1: '1', id2: '2', i, b: 'b'}))
    );
    const streamBFn = () => streamB;
    streamBFn.identifiers = ['id1', 'id2'];
    this.api.subscriptions.streamFromBoth.selfChangingProperties = streamBFn;
    this.api.subscriptions.streamFromBoth.withoutIdentifiers = () => streamB;
    this.api.subscriptions.streamFromBoth.identifiersFailure = () => streamB;

    const streamBIncreasing = () => interval(this.timeout).pipe(
      delay(this.timeout / 2),
      map(i => ({id: Math.floor(i / 4), i, b: 'b'}))
    );
    streamBIncreasing.identifiers = ['id'];
    this.api.subscriptions.streamFromBoth.increasingIdentifiers = streamBIncreasing; // removes the identifiers
  }

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class TestAdapterC extends TestAdapterBase {
  name = 'test adapter C';

  get isReady(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('Polkadapt', () => {
  let pa: Polkadapt<TestApi>;
  let connect1Spy: jasmine.Spy<() => void>;
  let connect2Spy: jasmine.Spy<() => void>;

  beforeEach(() => {
    pa = new Polkadapt();
    const adapter1 = new TestAdapterA();
    const adapter2 = new TestAdapterB();
    connect1Spy = spyOn(adapter1, 'connect');
    connect2Spy = spyOn(adapter2, 'connect');
    pa.register(adapter1, adapter2);
  });

  afterEach(() => {
    pa.unregister();
    pa.removeAllListeners('readyChange');
  });

  it('should register adapters.', () => {
    expect(pa.adapters.length).toBe(2);
    expect(connect1Spy).toHaveBeenCalled();
    expect(connect2Spy).toHaveBeenCalled();
  });

  it('should register an adapter at a later moment', () => {
    const adapter3 = new TestAdapterC();
    const connect3Spy = spyOn(adapter3, 'connect');
    pa.register(adapter3);
    expect(pa.adapters.length).toBe(3);
    expect(connect3Spy).toHaveBeenCalled();
  });
  it('should not be able to register the same adapter instance multiple times', () => {
    const adapter3 = new TestAdapterC();
    const connect3Spy = spyOn(adapter3, 'connect');
    pa.register(adapter3, adapter3);
    pa.register(adapter3);
    expect(pa.adapters.length).toBe(3);
    expect(pa.adapters[2].instance).toBe(adapter3);
    expect(pa.adapters[1].instance).not.toBe(adapter3);
    expect(connect3Spy).toHaveBeenCalledTimes(1);
  });

  it('should unregister one adapter', () => {
    const adapter1 = pa.adapters[0].instance;
    const disconnect1Spy = spyOn(adapter1, 'disconnect');
    pa.unregister(adapter1);
    expect(disconnect1Spy).toHaveBeenCalled();
    expect(pa.adapters.length).toBe(1);
  });

  it('should unregister all adapters', () => {
    const [adapter1, adapter2] = pa.adapters.map(a => a.instance);
    const disconnect1Spy = spyOn(adapter1, 'disconnect');
    const disconnect2Spy = spyOn(adapter2, 'disconnect');
    pa.unregister();
    expect(disconnect1Spy).toHaveBeenCalled();
    expect(disconnect2Spy).toHaveBeenCalled();
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

  it('should return an Observable when an adapter API is called.', (done) => {
    const value = (pa.run({chain: chainName}).values.successFromA as PolkadaptObservableCall)();
    const stream = (pa.run({chain: chainName}).subscriptions.successFromA as PolkadaptObservableCall)();
    expect(value).toBeInstanceOf(Observable);
    expect(stream).toBeInstanceOf(Observable);
    let count = 0;
    value.subscribe({
      complete: () => {
        count++;
        if (count === 2) {
          done();
        }
      }
    });
    const streamCompleted = jasmine.createSpy('streamCompleted');
    stream.pipe(take(4)).subscribe({
      complete: () => {
        count++;
        if (count === 2) {
          done();
        }
      }
    });
  });

  it('should wait until ready before an API call is processed.', (done) => {
    // Here we don't explicitly await pa.ready() and expect the API call to do this instead.
    const readyStateHandler = jasmine.createSpy('readyStateHandler');
    pa.once('readyChange', readyStateHandler);
    const valueObservable = pa.run({chain: chainName}).values.objectFromBoth();
    expect(readyStateHandler).not.toHaveBeenCalled();
    valueObservable.pipe(take(1)).subscribe({
      next: () => {
        expect(readyStateHandler).toHaveBeenCalledWith(true);
        done();
      },
      error: (error: Error) => {
        done.fail(error);
      }
    });
  });

  it('should return the Observable result of one adapter.', (done) => {
    (pa.run({chain: chainName}).values.successFromA as PolkadaptObservableCall)().subscribe({
      next: (result) => {
        result.subscribe((val) => {
          expect(val).toEqual('a');
          done();
        });
      },
      error: (error: Error) => {
        done.fail(error);
      }
    });
  });

  fit('should emit new values from multiple adapters if no identifiers are set, with observables', (done) => {
    let count = 0;
    const destroyer = new Subject<void>();
    (pa.run({chain: chainName}).subscriptions.streamFromBoth.withoutIdentifiers as PolkadaptObservableCall)().pipe(
      takeUntil(destroyer)
    ).subscribe({
      next: newResult => {
        newResult.pipe(
          take(4)
        ).subscribe(result => {
          switch (count) {
            case 0:
              expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
              break;
            case 1:
              expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a'});
              break;
            case 2:
              expect(result).toEqual({id1: '1', id2: '2', i: 0, b: 'b'});
              break;
            case 3:
              expect(result).toEqual({id1: '1', id2: '2', i: 2, a: 'a'});
              destroyer.next();
              destroyer.complete();
              break;
          }
          count += 1;
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        done();
      }
    });
  });

  fit('should emit new values from multiple adapters if no identifiers are set, no observables', (done) => {
    // TODO also primitives, arrays, object, or null/undefined.
    let count = 0;
    (pa.run({chain: chainName, observableResults: false}).subscriptions.streamFromBoth.withoutIdentifiers as PolkadaptObjectCall)().pipe(
      take(4)
    ).subscribe({
      next: result => {
        switch (count) {
          case 0:
            expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
            break;
          case 1:
            expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a'});
            break;
          case 2:
            expect(result).toEqual({id1: '1', id2: '2', i: 0, b: 'b'});
            break;
          case 3:
            expect(result).toEqual({id1: '1', id2: '2', i: 2, a: 'a'});
            break;
        }
        count += 1;
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        done();
      }
    });
  });

  fit('should modify a static object from multiple adapters based on the identifiers', (done) => {
    let count = 0;
    const destroyer = new Subject<void>();
    (pa.run({chain: chainName}).subscriptions.streamFromBoth.selfChangingProperties as PolkadaptObservableCall)().pipe(
      takeUntil(destroyer)
    ).subscribe({
      next: mergedResult => {
        mergedResult.pipe(
          take(3)
        ).subscribe(result => {
          if (count === 0) {
            expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
          } else if (count === 1) {
            expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a'});
          } else {
            expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a', b: 'b'});
            destroyer.next();
            destroyer.complete();
          }
          count++;
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        done();
      }
    });
  });

  it('should modify a static array of multiple objects from multiple adapters based on the identifiers', (done) => {
    let count = 0;
    pa.run().values.arrayFromBoth().subscribe({
      next: result => {
        if (count === 0) {
          expect(result).toEqual([
            {id: 1, a: true},
            {id: 2, a: false},
            {id: 3, same: 'a'},
          ]);
        } else if (count === 1) {
          expect(result).toEqual([
            {id: 1, a: true, b: true},
            {id: 2, a: false, b: false},
            {id: 3, same: 'b'},
          ]);
        }
        count++;
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        done();
      }
    });
  });

  xit('should modify an object from a single stream of updates', () => {});
  xit('should modify an array of multiple objects from a single stream of updates', () => {});
  xit('should modify an array of multiple objects from multiple streams of updates', () => {});

  it('should fail when one adapter Observable throws an Error.', (done) => {
    (pa.run({chain: chainName}).values.failureFromB as ApiCall)().subscribe({
      next: () => {
        done.fail();
      },
      error: () => {
        done();
      }
    });
  });

  xit('should reject when one adapter throws an error.');

  it('should reject when one of multiple adapters rejects.', (done) => {
    (pa.run({chain: chainName}).values.partialFailure as ApiCall)().subscribe({
      next: () => {
        done.fail();
      },
      error: () => {
        done();
      }
    });
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

  // it('should be able to run with a specific adapter', async () => {
  //   expect(await (pa.run({chain: chainName, adapters: 'test adapter A'}).values.successFromA as ResultObservable)()).toEqual('a');
  //   expect(await (pa.run({chain: chainName, adapters: ['test adapter A']}).values.successFromA as ResultObservable)()).toEqual('a');
  //   expect(await (pa.run({chain: chainName, adapters: pa.adapters[0].instance}).values.successFromA as ResultObservable)()).toEqual('a');
  //   expect(await (pa.run({chain: chainName, adapters: [pa.adapters[0].instance]}).values.successFromA as ResultObservable)()).toEqual('a');
  //   expect(await (pa.run({chain: chainName, adapters: 'test adapter B'}).values.successFromB as ResultObservable)()).toEqual('b');
  //   expect(await (pa.run({chain: chainName, adapters: pa.adapters[1].instance}).values.successFromB as ResultObservable)()).toEqual('b');
  // });
  //
  // it('should be able to run with multiple specified adapters', async () => {
  //   const result = await pa.run({chain: chainName, adapters: [pa.adapters[0].instance, 'test adapter B']}).values.successFromBoth();
  //   expect(result).toEqual({
  //     nested: {
  //       conflicted: ['a', 'b'],
  //       a: true,
  //       b: true
  //     }
  //   });
  // });
  //
  // it('should fail when specified adapters are not registered', async () => {
  //   const adapterA = pa.adapters[0].instance;
  //   pa.unregister(adapterA);
  //
  //   try {
  //     await (pa.run({chain: chainName, adapters: 'test adapter A'}).values.successFromA as ResultObservable)();
  //   } catch (e) {
  //     expect((e as Error).message).toEqual('The requested adapters have not been registered.');
  //   }
  //
  //   try {
  //     await (pa.run({chain: chainName, adapters: adapterA}).values.successFromA as ResultObservable)();
  //   } catch (e) {
  //     expect((e as Error).message).toEqual('The requested adapters have not been registered.');
  //   }
  //
  //   // todo include not for a specified chain
  // });
  //
  // // Adapter tests.
  // xit('should have a "name" property containing a name.');
  // xit('should have a "chain" property containing a name.');
  // xit('should have a "promise" property containing the Promise to the adapter API.');
  //
  // // Event listeners tests.
  // it('should add a listener', () => {
  //   const listener = jasmine.createSpy('listener', () => {
  //   });
  //   pa.on('readyChange', listener);
  //   const listeners = pa.listeners('readyChange');
  //   expect(listeners.length).toBe(1);
  //   expect(listeners[0]).toBe(listener);
  // });
  //
  // it('should emit an event', () => {
  //   const listener = jasmine.createSpy('listener');
  //   pa.on('readyChange', listener);
  //   pa.emit('readyChange');
  //   expect(listener).toHaveBeenCalled();
  // });
  //
  // it('should execute listeners when event emit', () => {
  //   const listenerA = jasmine.createSpy('listenerA');
  //   const listenerB = jasmine.createSpy('listenerB');
  //   pa.on('readyChange', listenerA);
  //   pa.on('readyChange', listenerB);
  //   expect(listenerA).toHaveBeenCalledTimes(0);
  //   expect(listenerB).toHaveBeenCalledTimes(0);
  //   pa.emit('readyChange', 'test1', 'test2', 'test3');
  //   expect(listenerA).toHaveBeenCalledTimes(1);
  //   expect(listenerA).toHaveBeenCalledWith('test1', 'test2', 'test3');
  //   expect(listenerB).toHaveBeenCalledTimes(1);
  //   expect(listenerB).toHaveBeenCalledWith('test1', 'test2', 'test3');
  //   pa.emit('readyChange', 'test4');
  //   expect(listenerA).toHaveBeenCalledTimes(2);
  //   expect(listenerA).toHaveBeenCalledWith('test4');
  //   expect(listenerB).toHaveBeenCalledTimes(2);
  //   expect(listenerB).toHaveBeenCalledWith('test4');
  // });
  //
  // it('should add a listener that removes itself after event emits', () => {
  //   const listener = jasmine.createSpy('listener');
  //   pa.once('readyChange', listener);
  //   pa.emit('readyChange');
  //   pa.emit('readyChange');
  //   expect(listener).toHaveBeenCalledTimes(1);
  // });
  //
  // it('should remove a listener', () => {
  //   const listener = jasmine.createSpy('listener');
  //   pa.on('readyChange', listener);
  //   pa.emit('readyChange');
  //   expect(listener).toHaveBeenCalledTimes(1);
  //   pa.off('readyChange', listener);
  //   pa.emit('readyChange');
  //   expect(listener).toHaveBeenCalledTimes(1);
  // });
  //
  // it('should remove all listener (per event name)', () => {
  //   const listener = jasmine.createSpy('listener');
  //   pa.on('readyChange', listener);
  //   pa.emit('readyChange');
  //   expect(listener).toHaveBeenCalledTimes(1);
  //   pa.removeAllListeners('readyChange');
  //   pa.emit('readyChange');
  //   expect(listener).toHaveBeenCalledTimes(1);
  // });
  //
  // it('should return all listeners registered for an event name', () => {
  //   const listenerA = () => {
  //   };
  //   const listenerB = () => {
  //   };
  //   pa.on('readyChange', listenerA);
  //   pa.on('readyChange', listenerB);
  //   const listeners = pa.listeners('readyChange');
  //   expect(listeners).toContain(listenerA);
  //   expect(listeners).toContain(listenerB);
  // });
  //
  // it('should return all event names with registered listeners', () => {
  //   const listener = () => {
  //   };
  //   pa.on('readyChange', listener);
  //   const eventNames = pa.eventNames();
  //   expect(eventNames).toContain('readyChange');
  // });
});
