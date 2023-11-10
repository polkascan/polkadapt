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


import { map, Observable, ReplaySubject, share, take, tap } from 'rxjs';
import { Adapter } from '../polkascan-explorer';
import * as pst from '../polkascan-explorer.types';

export const isHash = (hash: unknown): hash is string => isString(hash) && hash.startsWith('0x');


export const isPositiveNumber = (val: unknown): val is number => Number.isInteger(val) && (val as number) >= 0;


export const isString = (val: unknown): val is string => typeof val === 'string' || val instanceof String;


export const isNumber = (val: unknown): val is number => typeof val === 'number' && !isNaN(val);


export const isDefined = <T>(val: T | undefined | null): val is T => val !== null && val !== undefined;


export const isObject = (val: unknown): val is object => Object.prototype.toString.call(val) === '[object Object]';


export const isFunction = (val: unknown): val is () => void => typeof val === 'function';


export const isArray = (val: unknown): val is unknown[] => Array.isArray(val);

export const isDate = (date: unknown): date is Date =>
  isDefined(date) && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date as number);


const generateQuery = (
  name: string,
  fields?: string[],
  filters?: string[],
  isSubscription?: boolean,
  isList?: boolean,
  pageSize?: number,
  pageKey?: string,
  blockLimitOffset?: number,
  blockLimitCount?: number
) => {
  const type = isSubscription === true ? 'subscription' : 'query';
  let query: string;
  const config: string[] = [];


  if (filters && isArray(filters) && filters.length > 0) {
    config.push(`filters: { ${filters.join(', ')} }`);
  }

  if (pageSize && Number.isInteger(pageSize) && pageSize >= 1) {
    config.push(`pageSize: ${pageSize}`);
  }

  if (typeof pageKey === 'string') {
    config.push(`pageKey: "${pageKey}"`);
  }

  if (blockLimitOffset && Number.isInteger(blockLimitOffset) && blockLimitOffset >= 1) {
    config.push(`blockLimitOffset: ${blockLimitOffset}`);
  }

  if (blockLimitCount && Number.isInteger(blockLimitCount) && blockLimitCount >= 1) {
    config.push(`blockLimitCount: ${blockLimitCount}`);
  }

  if (isList === true) {
    let pageInfo = '';
    if (pageSize) {
      pageInfo = ', pageInfo { pageSize, pageNext, pagePrev, blockLimitOffset, blockLimitCount }';
    }
    query = `${type} {
      ${name}${config.length > 0 ? `( ${config.join(', ')} )` : ''} {
        objects {
          ${Array.isArray(fields) && fields.length > 0 ? fields.join(', ') : ''}
        }${pageInfo}
      }
    }`;

  } else {
    query = `${type} {
      ${name}${config.length > 0 ? `( ${config.join(', ')} )` : ''} {
        ${Array.isArray(fields) && fields.length > 0 ? fields.join(', ') : ''}
      }
    }`;
  }

  return query;
};


export const generateObjectQuery = (name: string,
                                    fields?: string[],
                                    filters?: string[]) => generateQuery(name, fields, filters);


export const generateObjectsListQuery = (name: string,
                                         fields?: string[],
                                         filters?: string[],
                                         pageSize?: number,
                                         pageKey?: string,
                                         blockLimitOffset?: number,
                                         blockLimitCount?: number) =>
  generateQuery(name, fields, filters, false, true, pageSize, pageKey, blockLimitOffset, blockLimitCount);


export const generateSubscriptionQuery = (name: string,
                                          fields?: string[],
                                          filters?: string[]) => generateQuery(name, fields, filters, true);


export const createObjectObservable = <T>(adapter: Adapter, name: string, query: string): Observable<T> => {
  if (!adapter) {
    throw new Error('[PolkascanAdapter]: Could not generate observable, adapter not present.');
  }

  if (!query) {
    throw new Error('[PolkascanAdapter]: Could not generate observable, query not present.');
  }

  if (!adapter.socket) {
    throw new Error('[PolkascanAdapter]: Could not generate observable, socket has not initialised in the adapter.');
  }

  const subject = new ReplaySubject<{[name: string]: T}>(1);
  const promise = adapter.socket.query(query) as Promise<{ [name: string]: T }>;

  promise.then(
    (response) => {
      subject.next(response);
    },
    (reason) => {
      subject.error(reason);
    });

  return subject.pipe(
    map((result) => {
      if (result[name] || result[name] === null) {
        return result[name];
      } else {
        throw new Error(`[PolkascanExplorerAdapter] ${name}: Returned response is invalid.`);
      }
    }),
    take(1),
    share({
      connector: () => new ReplaySubject(1),
      resetOnError: true,
      resetOnComplete: true,
      resetOnRefCountZero: true
    })
  );
};

export const createSubscriptionObservable = <T>(adapter: Adapter, name: string, query: string): Observable<T> => {

  if (!adapter) {
    throw new Error('[PolkascanAdapter]: Could not generate observable, adapter not present.');
  }

  if (!query) {
    throw new Error('[PolkascanAdapter]: Could not generate observable, query not present.');
  }

  let subscriptionCounter = 0;
  let unsubscribeFn: (() => void) | null = null;
  const source = new ReplaySubject<{ [name: string]: T }>(1);

  const emitResult = (response: { [name: string]: T }) => {
    source.next(response);
  };

  const subscriber = () => {
    if (subscriptionCounter === 0) {
      if (adapter && adapter.socket) {
        adapter.socket.createSubscription(query, emitResult).then(
          (unsubFn) => {
            unsubscribeFn = unsubFn;
          },
          (e: string) => {
            throw new Error(e);
          });
      }
    }
  };

  const unsubscriber = () => {
    if (subscriptionCounter === 0) {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
      unsubscribeFn = null;
    }
  };

  const shared = source.pipe(
    map((result) => {
      if (isObject(result[name]) || result[name] === null) {
        return result[name];
      } else {
        throw new Error(`[PolkascanExplorerAdapter] ${name} Returned response is invalid.`);
      }
    }),
    share({
      connector: () => new ReplaySubject(1),
      resetOnError: true,
      resetOnComplete: true,
      resetOnRefCountZero: true
    }),
    tap({
      subscribe: () => {
        subscriber();
        subscriptionCounter += 1;
      },
      unsubscribe: () => {
        subscriptionCounter -= 1;
        unsubscriber();
      }
    })
  );

  return shared;
};


export const createObjectsListObservable = <T>(
  adapter: Adapter,
  name: string,
  fields?: string[],
  filters?: string[],
  identifiers?: string[],
  pageSize?: number,
  blockLimitOffset?: number): Observable<T[]> => {

  if (!adapter) {
    throw new Error('[PolkascanAdapter]: Could not generate observable, adapter not present.');
  }

  let objectList: T[] = [];
  let listAtEnd = false;

  let pageNext: string | undefined;
  let blockLimitCount: number | undefined;
  let subscriptionCounter = 0;

  const source = new ReplaySubject<T[]>(1);

  const emitResult = () => {
    source.next(objectList);
  };

  const generateObjectList = (objects: T[]) => {
    if (identifiers && identifiers.length) {
      objectList = [...objectList, ...objects];

      if (objectList.length >= (pageSize as number)) {
        // Remove items beyond the pageSize.
        objectList.length = (pageSize as number);
        listAtEnd = true;
      }
    }
  };

  const loadNextItems = () => {
    if (adapter && adapter.socket && !listAtEnd) {
      if (subscriptionCounter === 0) {
        // No one is listening.
        return;
      }

      if (adapter && adapter.socket) {
        let query: string | undefined;

        if (pageNext) {
          query = generateObjectsListQuery(name, fields, filters, pageSize, pageNext, blockLimitOffset, blockLimitCount);
        } else if (blockLimitOffset && blockLimitCount) {
          const nextBlockLimitOffset = Math.max(0, blockLimitOffset - blockLimitCount);
          if (nextBlockLimitOffset > 0) {
            query = generateObjectsListQuery(name, fields, filters, pageSize, undefined, nextBlockLimitOffset, blockLimitCount);
          } else {
            // Shouldn't be able to load more. Return.
            return;
          }
        }

        if (!query) {
          // Generate the first query.
          query = generateObjectsListQuery(name, fields, filters, pageSize, undefined, blockLimitOffset, blockLimitCount);
        }

        // Start querying results.
        (adapter.socket.query(query) as Promise<{ [name: string]: pst.ListResponse<T> }>).then(
          (response) => {
            if (!listAtEnd && subscriptionCounter > 0) {
              const pageInfo = response[name]?.pageInfo;
              pageNext = pageInfo?.pageNext;
              blockLimitCount = pageInfo?.blockLimitCount;
              blockLimitOffset = pageInfo?.blockLimitOffset;

              if (pageNext) {
                listAtEnd = false;
              } else if (blockLimitOffset && blockLimitCount) {
                listAtEnd = (blockLimitOffset - blockLimitCount) <= 0;
              } else {
                listAtEnd = true;
              }

              const objects = response[name].objects;
              if (objects) {
                generateObjectList(objects);
                emitResult();
              }

              if (listAtEnd) {
                source.complete();
              } else if (subscriptionCounter > 0) {
                // Still items left. Go on with filling the list.
                if (objectList.length < (pageSize as number)) {
                  loadNextItems();
                }
              }
            }
          },
          (e: Error) => {
            source.error(e);
            throw e;
          }
        );
      }
    }
  };


  const shared = source.pipe(
    share({
      connector: () => new ReplaySubject(1),
      resetOnError: true,
      resetOnComplete: true,
      resetOnRefCountZero: true
    }),
    tap({
      subscribe: () => {
        subscriptionCounter += 1;
        if (subscriptionCounter === 1) {
          loadNextItems();
        }
      },
      unsubscribe: () => {
        subscriptionCounter -= 1;
      },
    })
  );

  return shared;
};
