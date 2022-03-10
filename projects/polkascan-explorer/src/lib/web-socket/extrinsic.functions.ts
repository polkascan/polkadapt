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


import { Adapter } from '../polkascan-explorer';
import * as pst from '../polkascan-explorer.types';
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
}


export const getExtrinsic = (adapter: Adapter) =>
  async (blockNumber: number, extrinsicIdx: number): Promise<pst.Extrinsic> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provide a block number (number).');
    }

    if (!isDefined(extrinsicIdx)) {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provide an extrinsicIdx (number).');
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provided block number must be a positive number.');
    }

    if (isPositiveNumber(extrinsicIdx)) {
      filters.push(`extrinsicIdx: ${extrinsicIdx}`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getExtrinsic: Provided extrinsicIdx must be a positive number.');
    }

    const query = generateObjectQuery('getExtrinsic', extrinsicDetailFields, filters);

    const result = await adapter.socket.query(query) as { getExtrinsic: pst.Extrinsic };
    const extrinsic = result.getExtrinsic;
    if (isObject(extrinsic)) {
      return extrinsic;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getExtrinsic: Returned response is invalid.`);
    }
  };


const createExtrinsicsFilters = (extrinsicsFilters?: ExtrinsicsFilters): string[] => {
  const filters: string[] = [];

  if (extrinsicsFilters && isObject(extrinsicsFilters)) {
    const blockNumber = extrinsicsFilters.blockNumber;
    const callModule = extrinsicsFilters.callModule;
    const callName = extrinsicsFilters.callName;
    const signed = extrinsicsFilters.signed;
    const multiAddressAccountId = extrinsicsFilters.multiAddressAccountId;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber as number}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided block number must be a positive number.');
      }
    }

    if (isDefined(callModule)) {
      if (isString(callModule)) {
        filters.push(`callModule: "${callModule as string}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided call module must be a non-empty string.');
      }
    }

    if (isDefined(callName)) {
      if (isString(callName)) {
        if (!isDefined(callModule)) {
          throw new Error('[PolkascanExplorerAdapter] Extrinsics: Missing call module (string), only call name is provided.');
        }
        filters.push(`callName: "${callName as string}"`);
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
        filters.push(`multiAddressAccountId: "${multiAddressAccountId as string}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided call module must be a non-empty string.');
      }
    }

  } else if (isDefined(extrinsicsFilters)) {
    throw new Error('[PolkascanExplorerAdapter] Extrinsics: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getExtrinsics = (adapter: Adapter) =>
  async (extrinsicsFilters?: ExtrinsicsFilters, pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Extrinsic>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = createExtrinsicsFilters(extrinsicsFilters);
    const query = generateObjectsListQuery('getExtrinsics', genericExtrinsicFields, filters, pageSize, pageKey);
    const result = await adapter.socket.query(query) as { getExtrinsics: pst.ListResponse<pst.Extrinsic> };
    const extrinsics = result.getExtrinsics.objects;

    if (isArray(extrinsics)) {
      return result.getExtrinsics;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getExtrinsics: Returned response is invalid.`);
    }
  };


export const subscribeNewExtrinsic = (adapter: Adapter) =>
  async (...args: (((extrinsic: pst.Extrinsic) => void) | ExtrinsicsFilters | undefined)[]): Promise<() => void> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((extrinsic: pst.Extrinsic) => void));
    if (!callback) {
      throw new Error(`[PolkascanExplorerAdapter] subscribeNewExtrinsic: No callback function is provided.`);
    }

    let filters: string[] = [];
    if (isObject(args[0])) {
      filters = createExtrinsicsFilters(args[0] as ExtrinsicsFilters);
    }

    const query = generateSubscription('subscribeNewExtrinsic', genericExtrinsicFields, filters);

    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result: { subscribeNewExtrinsic: pst.Extrinsic }) => {
      try {
        const extrinsic = result.subscribeNewExtrinsic;
        if (isObject(extrinsic)) {
          callback(extrinsic);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
