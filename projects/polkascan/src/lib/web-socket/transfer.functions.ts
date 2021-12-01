/*
 * PolkADAPT
 *
 * Copyright 2020-2021 Polkascan Foundation (NL)
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
  isPositiveNumber, isString
} from './helpers';

const genericTransferFields = [
  'blockNumber',
  'eventIdx',
  'extrinsicIdx',
  'fromMultiAddressType',
  'fromMultiAddressAccountId',
  'fromMultiAddressAccountIndex',
  'fromMultiAddressRaw',
  'fromMultiAddressAddress32',
  'fromMultiAddressAddress20',
  'toMultiAddressType',
  'toMultiAddressAccountId',
  'toMultiAddressAccountIndex',
  'toMultiAddressRaw',
  'toMultiAddressAddress32',
  'toMultiAddressAddress20',
  'value',
  'blockDatetime',
  'blockHash',
  'complete'
];


export interface TransfersFilters {
  fromMultiAddressAccountId?: string;
  toMultiAddressAccountId?: string;
}


export const getTransfer = (adapter: Adapter) => {
  return async (blockNumber: number, eventIdx: number): Promise<pst.Transfer> => {
    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error(`[PolkascanAdapter] getTransfer: Provide a block number (number).`);
    }

    if (!isDefined(eventIdx)) {
      throw new Error(`[PolkascanAdapter] getTransfer: Provide an eventIdx (number).`);
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error(`[PolkascanAdapter] getTransfer: Provided block number must be a positive number.`);
    }

    if (isPositiveNumber(eventIdx)) {
      filters.push(`eventIdx: ${eventIdx}`);
    } else {
      throw new Error(`[PolkascanAdapter] getTransfer: Provided eventIdx must be a positive number.`);
    }

    const query = generateObjectQuery('getTransfer', genericTransferFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const transfer: pst.Transfer = result.getTransfer;
    if (isObject(transfer)) {
      return transfer;
    } else {
      throw new Error(`[PolkascanAdapter] getTransfer: Returned response is invalid.`);
    }
  };
};


const createTransfersFilters = (transfersFilters?: TransfersFilters): string[] => {
  const filters: string[] = [];

  if (transfersFilters && isObject(transfersFilters)) {
    const fromMultiAddressAccountId = transfersFilters.fromMultiAddressAccountId;
    const toMultiAddressAccountId = transfersFilters.toMultiAddressAccountId;

    if (isDefined(fromMultiAddressAccountId)) {
      if (isString(fromMultiAddressAccountId)) {
        filters.push(`fromMultiAddressAccountId: "${fromMultiAddressAccountId}"`);
      } else {
        throw new Error('[PolkascanAdapter] Transfers: Provided fromMultiAddressAccountId must be a non-empty string.');
      }
    }

    if (isDefined(toMultiAddressAccountId)) {
      if (isString(toMultiAddressAccountId)) {
        filters.push(`toMultiAddressAccountId: "${toMultiAddressAccountId}"`);
      } else {
        throw new Error('[PolkascanAdapter] Transfers: Provided toMultiAddressAccountId must be a non-empty string.');
      }
    }
  } else if (isDefined(transfersFilters)) {
    throw new Error('[PolkascanAdapter] Transfers: Provided filters have to be wrapped in an object.');
  }

  return filters;
}


export const getTransfers = (adapter: Adapter) => {
  return async (transfersFilters?: TransfersFilters, pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Transfer>> => {
    const filters: string[] = createTransfersFilters(transfersFilters);
    const query = generateObjectsListQuery('getTransfers', genericTransferFields, filters, pageSize, pageKey);
    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const transfers: pst.Transfer[] = result.getTransfers.objects;

    if (isArray(transfers)) {
      return result.getTransfers;
    } else {
      throw new Error(`[PolkascanAdapter] getTransfers: Returned response is invalid.`);
    }
  };
};


export const subscribeNewTransfer = (adapter: Adapter) => {
  return async (...args: (((transfer: pst.Transfer) => void) | TransfersFilters | undefined)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((transfers: pst.Transfer) => void));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewTransfer: No callback function is provided.`);
    }

    let filters: string[] = [];
    if (isObject(args[0])) {
      filters = createTransfersFilters(args[0] as TransfersFilters);
    }

    const query = generateSubscription('subscribeNewTransfer', genericTransferFields, filters);

    // return the unsubscribe function.
    return !adapter.socket ? {} : await adapter.socket.createSubscription(query, (result) => {
      try {
        const transfer: pst.Transfer = result.subscribeNewTransfer;
        if (isObject(transfer)) {
          callback(transfer);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
};
