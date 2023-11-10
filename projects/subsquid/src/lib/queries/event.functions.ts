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

import { Adapter, Fields, Where } from '../subsquid';
import { catchError, filter, map, Observable, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import * as st from '../subsquid.types';
import { types } from '@polkadapt/core';
import { isDate, isDefined, isObject, isPositiveNumber, isString } from './helpers';
import { getLatestBlock } from './block.functions';

export type GSExplorerEventInput = {
  id: string;
  blockNumber: number;
  timestamp: string;
  palletName: string;
  eventName: string;
  indexInBlock: number;
  // argsStr: { [k: string]: any };
  block: {
    height: number;
    hash: string;
    specVersion: number;
    timestamp: string;
  };
  extrinsic: {
    indexInBlock: number;
  };
};

const gsExplorerFields: Fields = [
  'id',
  'blockNumber',
  'timestamp',
  'palletName',
  'eventName',
  'indexInBlock',
  // 'argsStr',
  {
    block: [
      'height',
      'hash',
      'specVersion',
      'timestamp'
    ]
  },
  {
    extrinsic: [
      'indexInBlock'
    ]
  },
];

export interface EventsFilters {
  blockNumber?: number;
  eventModule?: string;
  eventName?: string;
  extrinsicIdx?: number;
  specName?: string;
  specVersion?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}

export interface AccountEventsFilters extends EventsFilters {
  attributeName: string;
  pallet?: string;
  eventTypes?: { [pallet: string]: string[] };
}


const identifiers = ['blockNumber', 'eventIdx'];


export const getEventsBase = (
  adapter: Adapter,
  pageSize?: number,
  blockNumber?: string | number,
  eventIdx?: number,
  eventModule?: string,
  eventName?: string,
  extrinsicIdx?: number,
  specName?: string,
  specVersion?: number,
  dateRangeBegin?: Date,
  dateRangeEnd?: Date,
  blockRangeBegin?: number,
  blockRangeEnd?: number,
  accountIdHex?: string,
  eventTypes?: { [pallet: string]: string[] }
): Observable<types.Event[]> => {

  const gsWhere: Where = {};
  let orderBy: string | undefined = 'id_DESC';

  if (isDefined(blockNumber)) {
    if (isPositiveNumber(blockNumber)) {
      if (isPositiveNumber(eventIdx)) {
        orderBy = undefined;
      }
      gsWhere['blockNumber_eq'] = blockNumber;
    } else {
      return throwError(() => 'Provided block number must be a positive number.');
    }
  }

  if (isDefined(eventIdx)) {
    if (isPositiveNumber(eventIdx)) {
      gsWhere['indexInBlock_eq'] = eventIdx;
    } else {
      return throwError(() => 'Provided eventIdx must be a positive number.');
    }
  }

  if (isDefined(eventTypes)) {
    const entries = Object.entries(eventTypes);
    if (Object.entries(eventTypes).length === 1) {
      gsWhere['palletName_eq'] = entries[0][0];
      gsWhere['eventName_in'] = entries[0][1];
    } else if (entries.length > 1) {
      let andor: Where[];
      Object.entries(eventTypes).forEach(([p, events], i) => {
        if (i === 0) {
          andor = gsWhere['OR'] = [
            // eslint-disable-next-line @typescript-eslint/naming-convention
            {palletName_eq: p, eventName_in: events}
          ];
        } else {
          andor.push(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            {palletName_eq: p, eventName_in: events}
          );
        }
      });
    }
  } else {
    if (isDefined(eventModule)) {
      if (isString(eventModule)) {
        gsWhere['palletName_eq'] = eventModule;
      } else {
        return throwError(() => 'Provided event module (pallet) must be a non-empty string.');
      }
    }

    if (isDefined(eventName)) {
      if (isString(eventName)) {
        if (isDefined(eventModule)) {
          gsWhere['eventName_eq'] = eventName;
        } else {
          return throwError(() => 'Missing event module (string), only event name is provided.');
        }
      } else {
        return throwError(() => 'Provided event name must be a non-empty string.');
      }
    }
  }

  if (isDefined(extrinsicIdx)) {
    if (isPositiveNumber(extrinsicIdx)) {
      if (isDefined(blockNumber)) {
        gsWhere['extrinsic'] = gsWhere['extrinsic'] ? gsWhere['extrinsic'] as Where : {};
        gsWhere['extrinsic']['indexInBlock_eq'] = extrinsicIdx;
        orderBy = undefined;
      } else {
        return throwError(() => 'Missing block number (number), only extrinsicIdx is provided.');
      }
    } else {
      return throwError(() => 'Provided extrinsicIdx must be a positive number.');
    }
  }

  if (isDefined(specName)) {
    if (isString(specName)) {
      // Giant squid has not implemented specName. Ignore it for now.
    } else {
      return throwError(() => 'Provided spec name must be a non-empty string.');
    }
  }

  if (isDefined(specVersion)) {
    if (isPositiveNumber(specVersion)) {
      gsWhere['block'] = gsWhere['block'] ? gsWhere['block'] as Where : {};
      gsWhere['block']['specVersion_eq'] = specVersion;
    } else {
      return throwError(() => 'Provided spec version must be a number.');
    }
  }

  if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
    if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
      if (dateRangeBegin > dateRangeEnd) {
        return throwError(() => 'Provided date range is invalid.');
      }
      const timestampBegin = dateRangeBegin.toJSON();
      const timestampEnd = dateRangeEnd.toJSON();
      gsWhere['timestamp_gte'] = timestampBegin;
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided begin and end date must be a Date.');
    }
  } else if (isDefined(dateRangeBegin)) {
    if (isDate(dateRangeBegin)) {
      const timestampBegin = dateRangeBegin.toJSON();
      gsWhere['timestamp_gte'] = timestampBegin;
    } else {
      return throwError(() => 'Provided begin date must be a Date.');
    }
  } else if (isDefined(dateRangeEnd)) {
    if (isDate(dateRangeEnd)) {
      const timestampEnd = dateRangeEnd.toJSON();
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided end date must be a Date.');
    }
  }

  if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
      if (blockRangeEnd < blockRangeBegin) {
        return throwError(() => 'Provided block number range is invalid.');
      }
      gsWhere['blockNumber_gte'] = blockRangeBegin;
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided block range begin and end must be positive numbers.');
    }
  } else if (isDefined(blockRangeBegin)) {
    if (isPositiveNumber(blockRangeBegin)) {
      gsWhere['blockNumber_gte'] = blockRangeBegin;
    } else {
      return throwError(() => 'Provided begin block must be a positive number.');
    }
  } else if (isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeEnd)) {
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided end block must be a positive number.');
    }
  }

  if (isString(accountIdHex)) {
    gsWhere['argsStr_containsAny'] = accountIdHex;
  }

  const contentType = 'events';

  return adapter.queryGSExplorer<GSExplorerEventInput[]>(
    contentType,
    gsExplorerFields,
    gsWhere,
    orderBy,
    pageSize
  ).pipe(
    switchMap(
      (rawEvents) => {
        if (!rawEvents) {
          return throwError(() => new Error('Fetching events from subsquid failed.'));
        }

        if (rawEvents && rawEvents.length === 0) {
          return of([]);
        }

        return of(rawEvents);
      }
    ),
    map((events) =>
      events.map<st.Event>((event) => {
        return {
          blockNumber: event.blockNumber || event.block.height,
          eventIdx: event.indexInBlock,
          extrinsicIdx: event.extrinsic?.indexInBlock,
          event: event.palletName && event.eventName &&
            `${event.palletName}.${event.eventName}`,
          eventModule: event.palletName,
          eventName: event.eventName,
          // attributes: event.argsStr || null,
          blockDatetime: event.timestamp || event.block.timestamp,
          blockHash: event.block.hash,
          specVersion: event.block?.specVersion
        };
      })
    )
  );
};


export const getEvent = (adapter: Adapter) => {
  const fn = (blockNumber: number, eventIdx: number) =>
    getEventsBase(adapter, 1, blockNumber, eventIdx).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getEvent: ${e}`))),
      map((events) => events[0])
    );
  fn.identifiers = identifiers;
  return fn;
};


export const getEvents = (adapter: Adapter) => {
  const fn = (filters?: EventsFilters, pageSize?: number) => {
    filters = filters || {};
    return getEventsBase(
      adapter,
      pageSize,
      filters.blockNumber,
      undefined,
      filters.eventModule,
      filters.eventName,
      filters.extrinsicIdx,
      filters.specName,
      filters.specVersion,
      filters.dateRangeBegin,
      filters.dateRangeEnd,
      filters.blockRangeBegin,
      filters.blockRangeEnd
    ).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getEvents: ${e}`)))
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewEventBase = (adapter: Adapter) =>
  (_filters?: EventsFilters | AccountEventsFilters, accountIdHex?: string) => {
    const filters = isObject(_filters) ? _filters : {};
    let height: number;
    let timestamp: string;

    return getLatestBlock(adapter)().pipe(
      take(1),
      switchMap((block) => {
        if (isPositiveNumber(block.number)) {
          height = block.number;
        } else {
          return throwError(() => new Error('No block height found to start from'));
        }

        if (isString(block.datetime)) {
          timestamp = block.datetime;
        }

        if (isString(filters.dateRangeEnd)) {
          if ((new Date(timestamp)) > (new Date(filters.dateRangeEnd))) {
            return throwError(() => new Error('Latest block number is beyond the date range.'));
          }
        }

        return timer(0, 6000).pipe(
          switchMap(() => {
            if (isPositiveNumber(height)) {
              if (isPositiveNumber(filters.blockRangeBegin) && filters.blockRangeBegin < height) {
                // The latest block number is below the filtered range, return empty until height is matched.
                return of([]);
              }
              if (isPositiveNumber(filters.blockRangeEnd) && height > filters.blockRangeEnd) {
                // The latest block number exceeds the filtered range, stop.
                return throwError(() => new Error('Latest block number is beyond the filtered range.'));
              }
            }

            if (timestamp) {
              if (isString(filters.dateRangeBegin)) {
                if ((new Date(filters.dateRangeBegin)) < (new Date(timestamp))) {
                  // The latest block timestamp is below the filtered range, wait until the datetime matches.
                  return of([]);
                }
              }
            }

            return getEventsBase(
              adapter,
              100,
              filters.blockNumber,
              undefined,
              filters.eventModule || (filters as AccountEventsFilters).pallet,
              filters.eventName,
              filters.extrinsicIdx,
              filters.specName,
              filters.specVersion,
              filters.dateRangeBegin,
              filters.dateRangeEnd,
              height,
              filters.blockRangeEnd,
              accountIdHex,
              (filters as AccountEventsFilters).eventTypes
            ).pipe(
              tap((events) => {
                if (events.length > 0) {
                  // Check the last height that came from the response and reset the height to the next block number.
                  // The next cycle will start with the next block number.
                  height = events[0].blockNumber + 1;
                  timestamp = events[0].blockDatetime as string;
                }
              }),
              filter((events) => events.length > 0),
              switchMap((events) => of(...events.reverse()))
            );

            // On the next cycle try the next block with matching events;
            height += 1;
          })
        );
      }),
      catchError((e) => {
        console.error('[SubsquidAdapter] subscribeNewEvent', e);
        return of(undefined);
      }),
      filter((e): e is types.Event => isObject(e))
    );
  };


export const subscribeNewEvent = (adapter: Adapter) => {
  const fn = (filters?: EventsFilters) =>
    subscribeNewEventBase(adapter)(filters);
  fn.identifiers = identifiers;
  return fn;
};


const identifiersWithAttributeName = ['blockNumber', 'eventIdx', 'attributeName'];


export const getEventsByAccount = (adapter: Adapter) => {
  const fn = (accountIdHex: string, filters?: AccountEventsFilters, pageSize?: number) => {
    filters = filters || {} as AccountEventsFilters;
    return getEventsBase(
      adapter,
      pageSize,
      filters.blockNumber,
      undefined,
      filters.eventModule || filters.pallet,
      filters.eventName,
      filters.extrinsicIdx,
      filters.specName,
      filters.specVersion,
      filters.dateRangeBegin,
      filters.dateRangeEnd,
      filters.blockRangeBegin,
      filters.blockRangeEnd,
      accountIdHex,
      filters.eventTypes
    ).pipe(
      map<types.Event[], types.AccountEvent[]>((events) => {
          const accountEvents = events.map((event) => {
            return {
              blockNumber: event.blockNumber,
              eventIdx: event.eventIdx,
              attributeName: null,  // UNTIL GIANT SQUID SHOWS THE ARGUMENTS CORRECTLY
              accountId: accountIdHex,
              // attributes: event.attributes,
              pallet: event.eventModule,
              eventName: event.eventName,
              blockDatetime: event.blockDatetime,
              sortValue: null,
              extrinsicIdx: event.extrinsicIdx
            } as types.AccountEvent;
          })


          // const accountEvents = events
          //   .map((event) => {
          //       const attributes: unknown = isString(event.attributes)
          //         ? JSON.parse(event.attributes)
          //         : event.attributes;
          //       if (isObject(attributes)) {
          //         const attributeName = Object.keys(attributes)
          //           .find(key => (attributes as { [k: string]: unknown })[key] === accountIdHex);
          //
          //         if (attributeName) {
          //           return {
          //             blockNumber: event.blockNumber,
          //             eventIdx: event.eventIdx,
          //             attributeName,
          //             accountId: accountIdHex,
          //             // attributes: event.attributes,
          //             pallet: event.eventModule,
          //             eventName: event.eventName,
          //             blockDatetime: event.blockDatetime,
          //             sortValue: null,
          //             extrinsicIdx: event.extrinsicIdx
          //           } as types.AccountEvent;
          //         }
          //       }
          //       return undefined;
          //     }
          //   ).filter((ae): ae is types.AccountEvent => isObject(ae));
          return accountEvents;
        }
      ),
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getEventsByAccount: ${e}`)))
    );
  };
  fn.identifiers = identifiersWithAttributeName;
  return fn;
};


export const subscribeNewEventByAccount = (adapter: Adapter) => {
  const fn = (accountIdHex: string, filters?: AccountEventsFilters) =>
    subscribeNewEventBase(adapter)(filters, accountIdHex).pipe(
      map((event) => {
          return {
            blockNumber: event.blockNumber,
            eventIdx: event.eventIdx,
            attributeName: null,  // UNTIL GIANT SQUID SHOWS THE ARGUMENTS CORRECTLY
            accountId: accountIdHex,
            // attributes: event.attributes,
            pallet: event.eventModule,
            eventName: event.eventName,
            blockDatetime: event.blockDatetime,
            sortValue: null,
            extrinsicIdx: event.extrinsicIdx
          } as types.AccountEvent;

          //   const attributes: unknown = isString(event.attributes)
          //     ? JSON.parse(event.attributes)
          //     : event.attributes;
          //   if (isObject(attributes)) {
          //     const attributeName = Object.keys(attributes)
          //       .find(key => (attributes as { [k: string]: unknown })[key] === accountIdHex);
          //
          //     if (attributeName) {
          //       return {
          //         blockNumber: event.blockNumber,
          //         eventIdx: event.eventIdx,
          //         attributeName,
          //         accountId: accountIdHex,
          //         // attributes: event.attributes,
          //         pallet: event.eventModule,
          //         eventName: event.eventName,
          //         blockDatetime: event.blockDatetime,
          //         sortValue: null,
          //         extrinsicIdx: event.extrinsicIdx
          //       } as types.AccountEvent;
          //     }
          //   }
          //   return undefined;
        }
      ),
      filter((ae): ae is types.AccountEvent => isObject(ae))
    );
  fn.identifiers = identifiersWithAttributeName;
  return fn;
};
