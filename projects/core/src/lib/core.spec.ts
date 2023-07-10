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

import { AdapterBase, Polkadapt } from './core';
import { delay, interval, map, Observable, of, skip, Subject, take, takeUntil, throwError, zip } from 'rxjs';

type ApiCall = (() => Observable<unknown>) & { identifiers?: string[] };
type PolkadaptObservableCall = () => Observable<Observable<unknown>>;
type PolkadaptArrayOfObservablesCall = () => Observable<Observable<unknown>[]>;
type PolkadaptObjectCall = () => Observable<unknown>;

type TestApi = {
  values: {
    objectFromBoth: ApiCall;
    arrayFromBoth: ApiCall;
    failureFromA?: ApiCall;
    successFromA?: ApiCall;
    successFromB?: ApiCall;
    failureFromB?: ApiCall;
    bothFailure?: ApiCall;
    partialFailure?: ApiCall;
  };
  subscriptions: {
    newObjectFromBoth: ApiCall;
    newArrayFromBothIdentified: ApiCall;
    newArrayFromBothUnidentified: ApiCall;
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
  letter: string;
  timeout: number;
  api: TestApi;

  constructor(chain: string) {
    super(chain);
    const newArrayFromBoth = interval(this.timeout).pipe(
      delay(this.letter === 'a' ? 0 : 50),
      map((i) => {
        const arr: { [p: string]: unknown }[] = [{id: i + 1}, {id: i + 2}, {
          id: i + 3,
          nested: {isThisA: (this.letter === 'a')}
        }];
        arr[0][this.letter] = i;
        arr[1][this.letter] = i;
        return arr;
      }));
    this.api = {
      values: {
        objectFromBoth: () => {
          const obj = {
            id: 1,
            nested: {
              conflicted: this.letter,
            }
          };
          (obj.nested as { [p: string]: unknown })[this.letter] = true;
          return of(obj);
        },
        arrayFromBoth: () => {
          const arr: { [p: string]: unknown }[] = [{id: 1}, {id: 2}, {id: 3, nested: {isThisA: (this.letter === 'a')}}];
          arr[0][this.letter] = true;
          arr[1][this.letter] = false;
          return of(arr).pipe(delay(this.letter === 'a' ? 0 : this.timeout));
        }
      },
      subscriptions: {
        newObjectFromBoth: () => interval(this.timeout).pipe(
          delay(this.letter === 'a' ? 0 : 50),
          map(i => {
            const obj = {
              id: i,
              nested: {
                conflicted: this.letter + i.toString(),
              }
            };
            (obj.nested as { [p: string]: unknown })[this.letter] = i;
            return obj;
          })
        ),
        newArrayFromBothIdentified: () => newArrayFromBoth,
        newArrayFromBothUnidentified: () => newArrayFromBoth,
        streamFromA: {},
        streamFromBoth: {}
      }
    };
    this.api.values.objectFromBoth.identifiers = ['id'];
    this.api.values.arrayFromBoth.identifiers = ['id'];
    this.api.subscriptions.newArrayFromBothIdentified.identifiers = ['id'];
  }
}

class TestAdapterA extends TestAdapterBase {
  name = 'test adapter A';
  letter = 'a';
  timeout = 100;

  constructor() {
    super(chainName);
    this.api.values.successFromA = () => of('a');
    this.api.values.partialFailure = this.api.values.successFromA;
    this.api.values.failureFromA = () => throwError(() => new Error('Whenever'));
    this.api.values.bothFailure = this.api.values.failureFromA;
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
}

class TestAdapterB extends TestAdapterBase {
  name = 'test adapter B';
  letter = 'b';
  timeout = 100;

  constructor() {
    super(chainName);
    this.api.values.successFromB = () => of('b');
    this.api.values.failureFromB = () => throwError(() => new Error('Whatever'));
    this.api.values.partialFailure = this.api.values.failureFromB;
    this.api.values.bothFailure = this.api.values.failureFromB;
    this.api.subscriptions.failureFromB = () => interval(this.timeout).pipe(
      delay(50),
      map(i => {
        if (i === 4) {
          throw new Error('Error!');
        }
        return {b: i};
      })
    );
    this.api.subscriptions.partialFailure = this.api.subscriptions.failureFromB;

    const streamB = interval(this.timeout).pipe(
      delay(50),
      map(i => ({id1: '1', id2: '2', i, b: 'b'}))
    );
    const streamBFn = () => streamB;
    streamBFn.identifiers = ['id1', 'id2'];
    this.api.subscriptions.streamFromBoth.selfChangingProperties = streamBFn;
    this.api.subscriptions.streamFromBoth.withoutIdentifiers = () => streamB;
    this.api.subscriptions.streamFromBoth.identifiersFailure = () => streamB;

    const streamBIncreasing = () => interval(this.timeout).pipe(
      delay(50),
      map(i => ({id: Math.floor(i / 4), i, b: 'b'}))
    );
    streamBIncreasing.identifiers = ['id'];
    this.api.subscriptions.streamFromBoth.increasingIdentifiers = streamBIncreasing; // removes the identifiers
  }
}

class TestAdapterC extends TestAdapterBase {
  name = 'test adapter C';
  letter = 'c';
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
  });

  it('should register adapters.', () => {
    expect(pa.adapters.length).toBe(2);
    expect(connect1Spy).toHaveBeenCalled();
    expect(connect2Spy).toHaveBeenCalled();
  });

  it('should register an adapter at a later moment', () => {
    const adapter3 = new TestAdapterC(chainName);
    const connect3Spy = spyOn(adapter3, 'connect');
    pa.register(adapter3);
    expect(pa.adapters.length).toBe(3);
    expect(connect3Spy).toHaveBeenCalled();
  });

  it('should not be able to register the same adapter instance multiple times', () => {
    const adapter3 = new TestAdapterC(chainName);
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

  it('should return an Observable when an adapter API is called.', done => {
    const value = (pa.run().values.successFromA as PolkadaptObservableCall)();
    const stream = (pa.run({observableResults: false}).subscriptions.successFromA as PolkadaptObservableCall)();
    expect(value).toBeInstanceOf(Observable);
    expect(stream).toBeInstanceOf(Observable);

    let count = 0;
    value.subscribe({
      complete: () => {
        count += 1;
        if (count === 2) {
          done();
        }
      }
    });

    stream.pipe(take(3)).subscribe({
      complete: () => {
        count += 1;
        if (count === 2) {
          done();
        }
      }
    });
  });

  it('should return the Observable result of one adapter.', done => {
    (pa.run().values.successFromA as PolkadaptObservableCall)().subscribe({
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

  it('should emit new values from multiple adapters if no identifiers are set, with observables', done => {
    let count = 0;
    const destroyer = new Subject<void>();
    (pa.run().subscriptions.streamFromBoth.withoutIdentifiers as PolkadaptObservableCall)().pipe(
      takeUntil(destroyer)
    ).subscribe({
      next: newResult => {
        newResult.pipe(
          take(4)
        ).subscribe({
          next: (result) => {
            switch (count) {
              case 0:
                expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
                break;
              case 1:
                expect(result).toEqual({id1: '1', id2: '2', i: 0, b: 'b'});
                break;
              case 2:
                expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a'});
                break;
              case 3:
                expect(result).toEqual({id1: '1', id2: '2', i: 1, b: 'b'});
                destroyer.next();
                destroyer.complete();
                break;
            }
            count += 1;
          }
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(3);
        done();
      }
    });
  });

  it('should emit new values from multiple adapters if no identifiers are set, no observables', done => {
    // TODO also primitives, arrays, object, or null/undefined.
    let count = 0;
    (pa.run({observableResults: false}).subscriptions.streamFromBoth.withoutIdentifiers as PolkadaptObjectCall)().pipe(
      take(4)
    ).subscribe({
      next: result => {
        switch (count) {
          case 0:
            expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
            break;
          case 1:
            expect(result).toEqual({id1: '1', id2: '2', i: 0, b: 'b'});
            break;
          case 2:
            expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a'});
            break;
          case 3:
            expect(result).toEqual({id1: '1', id2: '2', i: 1, b: 'b'});
            break;
        }
        count += 1;
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(4);
        done();
      }
    });
  });

  it('should merge a static object from multiple adapters based on the identifiers, with observables', done => {
    let count = 0;
    const destroyer = new Subject<void>();
    (pa.run().subscriptions.streamFromBoth.selfChangingProperties as PolkadaptObservableCall)().pipe(
      takeUntil(destroyer)
    ).subscribe({
      next: mergedResult => {
        mergedResult.pipe(
          take(3)
        ).subscribe({
          next: (result) => {
            if (count === 0) {
              expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
            } else if (count === 1) {
              expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a', b: 'b'});
            } else {
              expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a', b: 'b'});
              destroyer.next();
              destroyer.complete();
            }
            count += 1;
          }
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(2);
        done();
      }
    });
  });

  it('should merge a static object from multiple adapters based on the identifiers, no observables', done => {
    let count = 0;
    (pa.run({observableResults: false}).subscriptions.streamFromBoth.selfChangingProperties as PolkadaptObjectCall)().pipe(
      take(3)
    ).subscribe({
      next: result => {
        if (count === 0) {
          expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a'});
        } else if (count === 1) {
          expect(result).toEqual({id1: '1', id2: '2', i: 0, a: 'a', b: 'b'});
        } else {
          expect(result).toEqual({id1: '1', id2: '2', i: 1, a: 'a', b: 'b'});
        }
        count += 1;
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(3);
        done();
      }
    });
  });

  it('should merge a static array of objects from multiple adapters based on the identifiers, with observables', done => {
    let count = 0;
    const observables: Observable<unknown>[] = [];

    (pa.run().values.arrayFromBoth as unknown as PolkadaptArrayOfObservablesCall)().subscribe({
      next: mergedResult => {
        expect(Array.isArray(mergedResult)).toBeTrue();
        expect(mergedResult.length).toBe(3);
        mergedResult.forEach((obs) => {
          if (observables.indexOf(obs) === -1) {
            observables.push(obs);
            obs.subscribe({
                next: (result) => {
                  switch (count) {
                    case 0:
                      expect(result).toEqual({id: 1, a: true});
                      break;
                    case 1:
                      expect(result).toEqual({id: 2, a: false});
                      break;
                    case 2:
                      expect(result).toEqual({id: 3, nested: {isThisA: true}});
                      break;
                    case 3:
                      expect(result).toEqual({id: 1, a: true, b: true});
                      break;
                    case 4:
                      expect(result).toEqual({id: 2, a: false, b: false});
                      break;
                    case 5:
                      expect(result).toEqual({id: 3, nested: {isThisA: false}});
                      break;
                  }
                  count += 1;
                }
              }
            );
          }
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(6);
        done();
      }
    });
  });

  it('should merge a static array of objects from multiple adapters based on the identifiers, no observables', done => {
    let count = 0;
    pa.run({observableResults: false}).values.arrayFromBoth().subscribe({
      next: result => {
        if (count === 0) {
          expect(result).toEqual([
            {id: 1, a: true},
            {id: 2, a: false},
            {id: 3, nested: {isThisA: true}},
          ]);
        } else if (count === 1) {
          expect(result).toEqual([
            {id: 1, a: true, b: true},
            {id: 2, a: false, b: false},
            {id: 3, nested: {isThisA: false}},
          ]);
        }
        count += 1;
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(2);
        done();
      }
    });
  });

  it('should modify an object from a single stream of updates', done => {
    let doneCount = 0;

    let i = 0;
    (pa.run({observableResults: false}).subscriptions.streamFromA.selfChangingProperties as PolkadaptObjectCall)().pipe(
      take(5)
    ).subscribe({
      next: (result) => {
        expect(result).toEqual({
          id1: '1',
          id2: '2',
          i,
          a: 'a'
        });
        i += 1;
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        doneCount += 1;
        if (doneCount === 2) {
          done();
        }
      }
    });

    const destroyer = new Subject<void>();
    let ii = 0;
    (pa.run().subscriptions.streamFromA.selfChangingProperties as PolkadaptObservableCall)().pipe(
      takeUntil(destroyer)
    ).subscribe({
      next: (resultObs) => {
        resultObs.pipe(
          take(5)
        ).subscribe({
          next: (result) => {
            expect(result).toEqual({
              id1: '1',
              id2: '2',
              i: ii,
              a: 'a'
            });
            ii += 1;
          },
          error: (error: Error) => {
            done.fail(error);
          },
          complete: () => {
            destroyer.next();
            destroyer.complete();
          }
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        doneCount += 1;
        if (doneCount === 2) {
          done();
        }
      }
    });
  });

  it('should replace a dynamic array of multiple unidentified objects from multiple streams of updates', done => {
    let count = 0;
    const destroyer = new Subject<void>();
    (pa.run().subscriptions.newArrayFromBothUnidentified as PolkadaptObservableCall)().pipe(
      takeUntil(destroyer)
    ).subscribe({
      next: newResult => {
        newResult.pipe(
          take(6)
        ).subscribe({
          next: (result) => {
            switch (count) {
              case 0:
                expect(result).toEqual([
                  {id: 1, a: 0},
                  {id: 2, a: 0},
                  {id: 3, nested: {isThisA: true}}
                ]);
                break;
              case 1:
                expect(result).toEqual([
                  {id: 1, b: 0},
                  {id: 2, b: 0},
                  {id: 3, nested: {isThisA: false}}
                ]);
                break;
              case 2:
                expect(result).toEqual([
                  {id: 2, a: 1},
                  {id: 3, a: 1},
                  {id: 4, nested: {isThisA: true}}
                ]);
                break;
              case 3:
                expect(result).toEqual([
                  {id: 2, b: 1},
                  {id: 3, b: 1},
                  {id: 4, nested: {isThisA: false}}
                ]);
                break;
              case 4:
                expect(result).toEqual([
                  {id: 3, a: 2},
                  {id: 4, a: 2},
                  {id: 5, nested: {isThisA: true}}
                ]);
                break;
              case 5:
                expect(result).toEqual([
                  {id: 3, b: 2},
                  {id: 4, b: 2},
                  {id: 5, nested: {isThisA: false}}
                ]);
                destroyer.next();
                destroyer.complete();
                break;
            }
            count += 1;
          }
        });
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(5);
        done();
      }
    });
  });

  it('should modify a dynamic array of multiple identified objects from multiple streams of updates, with observables', done => {
    let count = 0;
    const destroyer = new Subject<void>();
    const objObservables = new Set<Observable<unknown>>();
    (pa.run().subscriptions.newArrayFromBothIdentified as unknown as PolkadaptArrayOfObservablesCall)().pipe(
      takeUntil(destroyer),
    ).subscribe({
      next: mergedResult => {
        expect(Array.isArray(mergedResult)).toBeTrue();
        expect(mergedResult.length).toBe(3);
        for (const obs of mergedResult) {
          obs.pipe(
            take(1),
            takeUntil(destroyer)
          ).subscribe(result => {
            switch (count) {
              case 0:
                expect(result).toEqual({id: 1, a: 0});
                break;
              case 1:
                expect(result).toEqual({id: 2, a: 0});
                break;
              case 2:
                expect(result).toEqual({id: 3, nested: {isThisA: true}});
                break;
              case 3:
                expect(result).toEqual({id: 1, a: 0, b: 0});
                break;
              case 4:
                expect(result).toEqual({id: 2, a: 0, b: 0});
                break;
              case 5:
                expect(result).toEqual({id: 3, nested: {isThisA: false}});
                break;
              case 6:
                expect(result).toEqual({id: 2, a: 1, b: 0});
                break;
              case 7:
                expect(result).toEqual({id: 3, a: 1, nested: {isThisA: false}});
                break;
              case 8:
                expect(result).toEqual({id: 4, nested: {isThisA: true}});
                break;
              case 9:
                expect(result).toEqual({id: 2, a: 1, b: 1});
                break;
              case 10:
                expect(result).toEqual({id: 3, a: 1, b: 1, nested: {isThisA: false}});
                break;
              case 11:
                expect(result).toEqual({id: 4, nested: {isThisA: false}});
                break;
              case 12:
                expect(result).toEqual({id: 3, a: 2, b: 1, nested: {isThisA: false}});
                break;
              case 13:
                expect(result).toEqual({id: 4, a: 2, nested: {isThisA: false}});
                break;
              case 14:
                expect(result).toEqual({id: 5, nested: {isThisA: true}});
                destroyer.next();
                destroyer.complete();
                break;
            }
            count += 1;
          });
          objObservables.add(obs);
        }
      },
      error: (error: Error) => {
        done.fail(error);
      },
      complete: () => {
        expect(count).toBe(14);
        expect(objObservables.size).toBe(4);
        done();
      }
    });
  });

  it('should only work for a correct chain name.', done => {
    let count = 0;
    const cont = () => {
      count += 1;
      if (count === 6) {
        done();
      }
    };

    // Test without chain name first.
    (pa.run().values.objectFromBoth as PolkadaptObservableCall)().pipe(
      take(1)
    ).subscribe({
      next: result1 => {
        expect(result1).toBeInstanceOf(Observable);
        // Now register another adapter for a different chain.
        pa.register(new TestAdapterC('other chain'));
        // Test again without chain name. Now it should fail.
        (pa.run().values.objectFromBoth as PolkadaptObservableCall)().pipe(
          take(1)
        ).subscribe({
          next: () => {
            done.fail();
          },
          error: (err: Error) => {
            expect(err.message).toBe('Please supply chain argument, because adapters have been registered for multiple chains.');
            cont();
          }
        });
        // Test correct name.
        (pa.run(chainName).values.objectFromBoth as PolkadaptObservableCall)().pipe(
          take(1)
        ).subscribe({
          next: result => {
            expect(result).toBeInstanceOf(Observable);
            cont();
          },
          error: () => {
            done.fail();
          }
        });
        // Test correct name as param and test result value.
        (pa.run({chain: chainName, observableResults: false}).values.objectFromBoth as PolkadaptObjectCall)().pipe(
          take(1)
        ).subscribe({
          next: result => {
            expect(result).toEqual({
              id: 1,
              nested: {conflicted: 'a', a: true}
            });
            cont();
          },
          error: () => {
            done.fail();
          }
        });
        // Test other chain name as param and test result value.
        (pa.run({chain: 'other chain', observableResults: false}).values.objectFromBoth as PolkadaptObjectCall)().pipe(
          take(1)
        ).subscribe({
          next: result => {
            expect(result).toEqual({
              id: 1,
              nested: {conflicted: 'c', c: true}
            });
            cont();
          },
          error: () => {
            done.fail();
          }
        });
        // Test incorrect chain name.
        (pa.run('wrong chain').values.objectFromBoth as PolkadaptObservableCall)().pipe(
          take(1)
        ).subscribe({
          next: () => {
            done.fail();
          },
          error: (err: Error) => {
            expect(err.message).toBe('No adapters were found containing path values.objectFromBoth');
            cont();
          }
        });
        // Test incorrect chain name as param.
        (pa.run({chain: 'wrong chain'}).values.objectFromBoth as PolkadaptObservableCall)().pipe(
          take(1)
        ).subscribe({
          next: () => {
            done.fail();
          },
          error: (err: Error) => {
            expect(err.message).toBe('No adapters were found containing path values.objectFromBoth');
            cont();
          }
        });
      },
      error: () => {
        done.fail();
      }
    });
  });

  it('should fail when one adapter Observable throws an Error.', done => {
    (pa.run().values.failureFromB as ApiCall)().subscribe({
      next: () => {
        done.fail();
      },
      error: (err: Error) => {
        expect(err.message).toBe('Whatever');
        done();
      }
    });
  });

  it('should not reject when one of multiple adapters throws an Error.', done => {
    (pa.run({observableResults: false}).values.partialFailure as ApiCall)().subscribe({
      next: (a) => {
        // Stream A will not fail.
        expect(a).toEqual('a');
      },
      error: () => {
        // stream B will fail but should not appear.
        done.fail();
      },
      complete: () => {
        done();
      }
    });
  });

  it('should reject when both of multiple adapters throws an Error.', done => {
    (pa.run({observableResults: false}).values.bothFailure as ApiCall)().subscribe({
      error: (err: Error) => {
        // stream B will fail.
        expect(err.message).toEqual(
          'Whenever\n' +
          'Whatever'
        );
        done();
      }
    });
  });

  xit('should unsubscribe multiple adapters.');
  xit('should unsubscribe multiple adapters when one adapter throws an error.');
  xit('should unsubscribe multiple adapters after unregister.');
  xit('should be clear which adapter threw an error.');

  it('should be able to run with a specific adapter', done => {
    zip(
      (pa.run({
        chain: chainName,
        adapters: 'test adapter A',
        observableResults: false
      }).values.successFromA as ApiCall)(),
      (pa.run({
        chain: chainName,
        adapters: ['test adapter A'],
        observableResults: false
      }).values.successFromA as ApiCall)(),
      (pa.run({
        chain: chainName,
        adapters: pa.adapters[0].instance,
        observableResults: false
      }).values.successFromA as ApiCall)(),
      (pa.run({
        chain: chainName,
        adapters: [pa.adapters[0].instance],
        observableResults: false
      }).values.successFromA as ApiCall)(),
      (pa.run({
        chain: chainName,
        adapters: 'test adapter B',
        observableResults: false
      }).values.successFromB as ApiCall)(),
      (pa.run({
        chain: chainName,
        adapters: pa.adapters[1].instance,
        observableResults: false
      }).values.successFromB as ApiCall)(),
    ).subscribe((results) => {
      expect((results as string[])[0]).toEqual('a');
      expect((results as string[])[1]).toEqual('a');
      expect((results as string[])[2]).toEqual('a');
      expect((results as string[])[3]).toEqual('a');
      expect((results as string[])[4]).toEqual('b');
      expect((results as string[])[5]).toEqual('b');
      done();
    });
  });

  it('should be able to run with multiple specified adapters', done => {
    pa.run({
      chain: chainName,
      adapters: [pa.adapters[0].instance, 'test adapter B'],
      observableResults: false
    }).values.objectFromBoth()
      .pipe(skip(1))
      .subscribe({
        next: (result) => {
          expect(result).toEqual({
            id: 1,
            nested: {
              conflicted: 'b',
              a: true,
              b: true
            }
          });
        },
        complete: () => {
          done();
        }
      });
  });

  it('should fail when specified adapters are not registered', done => {
    const adapterA = pa.adapters[0].instance;
    pa.unregister(adapterA);

    try {
      (pa.run({chain: chainName, adapters: 'test adapter A'}).values.successFromA as ApiCall)().subscribe();
    } catch (e) {
      expect((e as Error).message).toEqual('The requested adapters have not been registered.');
    }

    try {
      (pa.run({chain: chainName, adapters: adapterA}).values.successFromA as ApiCall)().subscribe();
    } catch (e) {
      expect((e as Error).message).toEqual('The requested adapters have not been registered.');
    }

    done();
  });

});
