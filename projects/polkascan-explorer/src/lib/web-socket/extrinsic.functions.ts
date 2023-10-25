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


import { Adapter } from '../polkascan-explorer';
import * as pst from '../polkascan-explorer.types';
import { types } from '@polkadapt/core';
import {
  createObjectObservable,
  createObjectsListObservable,
  createSubscriptionObservable,
  generateObjectQuery,
  generateSubscriptionQuery,
  isDate,
  isDefined, isHash,
  isNumber,
  isObject,
  isPositiveNumber,
  isString
} from './helpers';
import { filter, Observable } from 'rxjs';

const genericExtrinsicFields = [
  'blockNumber',
  'extrinsicIdx',
  'hash',
  'callModule',
  'callName',
  'signed',
  'blockHash',
  'blockDatetime',
  'multiAddressAccountId'
];

const extrinsicDetailFields = [
  'blockNumber',
  'extrinsicIdx',
  'hash',
  'call',
  'callModule',
  'callName',
  'callArguments',
  'callHash',
  'signed',
  'signature',
  'multiAddressAccountId',
  'extrinsicLength',
  'nonce',
  'blockDatetime',
  'blockHash',
  'specName',
  'specVersion'
];


export interface ExtrinsicsFilters {
  blockNumber?: number;
  callModule?: string;
  callName?: string;
  signed?: number;
  multiAddressAccountId?: string;
  specName?: string;
  specVersion?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}

const identifiers = ['blockNumber', 'extrinsicIdx'];

export const getExtrinsic = (adapter: Adapter) => {
  const fn = (blockNumberOrHash: number | string, extrinsicIdx?: number): Observable<types.Extrinsic> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (!isDefined(blockNumberOrHash)) {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provide a block number (number) or hash (string).');
    }

    if (!isDefined(extrinsicIdx)) {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provide an extrinsicIdx (number).');
    }

    if (isPositiveNumber(blockNumberOrHash)) {
      filters.push(`blockNumber: ${blockNumberOrHash}`);
    } else if (isHash(blockNumberOrHash)) {
      filters.push(`hash: "${blockNumberOrHash}"`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provided block number must be a positive number or a hash string.');
    }

    if (isPositiveNumber(extrinsicIdx)) {
      filters.push(`extrinsicIdx: ${extrinsicIdx}`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provided extrinsicIdx must be a positive number.');
    }

    const query = generateObjectQuery('getExtrinsic', extrinsicDetailFields, filters);
    return createObjectObservable<pst.Extrinsic>(adapter, 'getExtrinsic', query);
  };
  fn.identifiers = identifiers;
  return fn;
};


const createExtrinsicsFilters = (extrinsicsFilters?: ExtrinsicsFilters): string[] => {
  const filters: string[] = [];

  if (extrinsicsFilters && isObject(extrinsicsFilters)) {
    const blockNumber = extrinsicsFilters.blockNumber;
    const callModule = extrinsicsFilters.callModule;
    const callName = extrinsicsFilters.callName;
    const signed = extrinsicsFilters.signed;
    const multiAddressAccountId = extrinsicsFilters.multiAddressAccountId;
    const specName = extrinsicsFilters.specName;
    const specVersion = extrinsicsFilters.specVersion;
    const dateRangeBegin = extrinsicsFilters.dateRangeBegin;
    const dateRangeEnd = extrinsicsFilters.dateRangeEnd;
    const blockRangeBegin = extrinsicsFilters.blockRangeBegin;
    const blockRangeEnd = extrinsicsFilters.blockRangeEnd;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided block number must be a positive number.');
      }
    }

    if (isDefined(callModule)) {
      if (isString(callModule)) {
        filters.push(`callModule: "${callModule}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided call module must be a non-empty string.');
      }
    }

    if (isDefined(callName)) {
      if (isString(callName)) {
        if (!isDefined(callModule)) {
          throw new Error('[PolkascanExplorerAdapter] Extrinsics: Missing call module (string), only call name is provided.');
        }
        filters.push(`callName: "${callName}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided call name must be a non-empty string.');
      }
    }

    if (isDefined(signed)) {
      if (Number.isInteger(signed) && (signed === 0 || signed === 1)) {
        filters.push(`signed: ${signed}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided signed must be an number with value 0 or 1.');
      }
    }

    if (isDefined(multiAddressAccountId)) {
      if (isString(multiAddressAccountId)) {
        filters.push(`multiAddressAccountId: "${multiAddressAccountId}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided call module must be a non-empty string.');
      }
    }

    if (isDefined(specName)) {
      if (isString(specName)) {
        filters.push(`specName: "${specName}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided spec name must be a non-empty string.');
      }
    }

    if (isDefined(specVersion)) {
      if (isNumber(specVersion)) {
        filters.push(`specVersion: ${specVersion}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided spec version must be a number.');
      }
    }

    if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
      if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeRange: { begin: "${dateRangeBegin.toISOString()}", end: "${dateRangeEnd.toISOString()}" }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided begin and end date must be a Date.');
      }
    } else if (isDefined(dateRangeBegin)) {
      if (isDate(dateRangeBegin)) {
        filters.push(`blockDatetimeGte: "${dateRangeBegin.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided begin date must be a Date.');
      }
    } else if (isDefined(dateRangeEnd)) {
      if (isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeLte: "${dateRangeEnd.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided end date must be a Date.');
      }
    }

    if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberRange: { begin: ${blockRangeBegin}, end: ${blockRangeEnd} }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided begin and end block must be a positive number.');
      }
    } else if (isDefined(blockRangeBegin)) {
      if (isPositiveNumber(blockRangeBegin)) {
        filters.push(`blockNumberGte: ${blockRangeBegin}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided begin block must be a positive number.');
      }
    } else if (isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberLte: ${blockRangeEnd}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided end block must be a positive number.');
      }
    }

  } else if (isDefined(extrinsicsFilters)) {
    throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getExtrinsics = (adapter: Adapter) => {
  const fn = (extrinsicsFilters?: ExtrinsicsFilters,
              pageSize?: number): Observable<types.Extrinsic[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = createExtrinsicsFilters(extrinsicsFilters);
    const blockLimitOffset = extrinsicsFilters && extrinsicsFilters.blockRangeEnd ? extrinsicsFilters.blockRangeEnd : undefined;
    return createObjectsListObservable<types.Extrinsic>(
      adapter,
      'getExtrinsics',
      genericExtrinsicFields,
      filters,
      identifiers,
      pageSize,
      blockLimitOffset
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewExtrinsic = (adapter: Adapter) => {
  const fn = (extrinsicFilters?: ExtrinsicsFilters): Observable<types.Extrinsic> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    let filters: string[] = [];
    if (isObject(extrinsicFilters)) {
      filters = createExtrinsicsFilters(extrinsicFilters);
    }

    const query = generateSubscriptionQuery('subscribeNewExtrinsic', genericExtrinsicFields, filters);
    return createSubscriptionObservable<pst.Extrinsic>(adapter, 'subscribeNewExtrinsic', query).pipe(
      filter((e) => isObject(e)));
  };
  fn.identifiers = identifiers;
  return fn;
};

