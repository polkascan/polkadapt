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


import { Adapter } from '../polkascan';
import * as pst from '../polkascan.types';
import {
  generateObjectQuery,
  generateObjectsListQuery,
  generateSubscription,
  isArray,
  isDefined,
  isFunction,
  isObject,
  isPositiveNumber,
  isString
} from './helpers';

const genericExtrinsicFields = ['blockNumber', 'extrinsicIdx', 'hash', 'callModule', 'callName', 'signed', 'blockHash', 'blockDatetime'];

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
  'extrinsicLength',
  'nonce',
  'blockDatetime',
  'blockHash'
];

export interface ExtrinsicsFilters {
  blockNumber?: number;
  callModule?: string;
  callName?: string;
  signed?: number;
}


export const getExtrinsic = (adapter: Adapter) => {
  return async (blockNumber: number, extrinsicIdx: number): Promise<pst.Extrinsic> => {
    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error('[PolkascanAdapter] getExtrinsic: Provide a block number (number).');
    }

    if (!isDefined(extrinsicIdx)) {
      throw new Error('[PolkascanAdapter] getExtrinsic: Provide an extrinsicIdx (number).');
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error('[PolkascanAdapter] getExtrinsic: Provided block number must be a positive number.');
    }

    if (isPositiveNumber(extrinsicIdx)) {
      filters.push(`extrinsicIdx: ${extrinsicIdx}`);
    } else {
      throw new Error('[PolkascanAdapter] getExtrinsic: Provided extrinsicIdx must be a positive number.');
    }

    const query = generateObjectQuery('getExtrinsic', extrinsicDetailFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const extrinsic: pst.Extrinsic = result.getExtrinsic;
    if (isObject(extrinsic)) {
      return extrinsic;
    } else {
      throw new Error(`[PolkascanAdapter] getExtrinsic: Returned response is invalid.`);
    }
  };
};


const createExtrinsicsFilters = (extrinsicsFilters?: ExtrinsicsFilters): string[] => {
  const filters: string[] = [];

  if (extrinsicsFilters && isObject(extrinsicsFilters)) {
    const blockNumber = extrinsicsFilters.blockNumber;
    const callModule = extrinsicsFilters.callModule;
    const callName = extrinsicsFilters.callName;
    const signed = extrinsicsFilters.signed;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] Extrinsics: Provided block number must be a positive number.');
      }
    }

    if (isDefined(callModule)) {
      if (isString(callModule)) {
        filters.push(`callModule: "${callModule}"`);
      } else {
        throw new Error('[PolkascanAdapter] Extrinsics: Provided call module must be a non-empty string.');
      }
    }

    if (isDefined(callName)) {
      if (isString(callName)) {
        if (!isDefined(callModule)) {
          throw new Error('[PolkascanAdapter] Extrinsics: Missing call module (string), only call name is provided.');
        }
        filters.push(`callName: "${callName}"`);
      } else {
        throw new Error('[PolkascanAdapter] Extrinsics: Provided call name must be a non-empty string.');
      }
    }

    if (isDefined(signed)) {
      if (Number.isInteger(signed) && (signed === 0 || signed === 1)) {
        filters.push(`signed: ${signed}`);
      } else {
        throw new Error('[PolkascanAdapter] Extrinsics: Provided signed must be an number with value 0 or 1.');
      }
    }

  } else if (isDefined(extrinsicsFilters)) {
    throw new Error('[PolkascanAdapter] Extrinsics: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getExtrinsics = (adapter: Adapter) => {
  return async (extrinsicsFilters?: ExtrinsicsFilters, pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Extrinsic>> => {
    let filters: string[];
    try {
      filters = createExtrinsicsFilters(extrinsicsFilters);
    } catch (e) {
      throw new Error(e);
    }

    const query = generateObjectsListQuery('getExtrinsics', genericExtrinsicFields, filters, pageSize, pageKey);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const extrinsics = result.getExtrinsics.objects;
    if (isArray(extrinsics)) {
      return result.getExtrinsics;
    } else {
      throw new Error(`[PolkascanAdapter] getExtrinsics: Returned response is invalid.`);
    }
  };
};


export const subscribeNewExtrinsic = (adapter: Adapter) => {
  return async (...args: (((extrinsic: pst.Extrinsic) => void) | ExtrinsicsFilters | undefined)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((extrinsic: pst.Extrinsic) => void));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewExtrinsic: No callback function is provided.`);
    }

    let filters: string[] = [];
    if (isObject(args[0])) {
      filters = createExtrinsicsFilters(args[0] as ExtrinsicsFilters);
    }

    const query = generateSubscription('subscribeNewExtrinsic', genericExtrinsicFields, filters);

    // return the unsubscribe function.
    return !adapter.socket ? {} : await adapter.socket.createSubscription(query, (result) => {
      try {
        const extrinsic: pst.Extrinsic = result.subscribeNewExtrinsic;
        if (isObject(extrinsic)) {
          callback(extrinsic);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
};
