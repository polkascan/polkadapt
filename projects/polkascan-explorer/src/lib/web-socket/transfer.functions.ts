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


export const getTransfer = (adapter: Adapter) =>
  async (blockNumber: number, eventIdx: number): Promise<pst.Transfer> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error(`[PolkascanExplorerAdapter] getTransfer: Provide a block number (number).`);
    }

    if (!isDefined(eventIdx)) {
      throw new Error(`[PolkascanExplorerAdapter] getTransfer: Provide an eventIdx (number).`);
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getTransfer: Provided block number must be a positive number.`);
    }

    if (isPositiveNumber(eventIdx)) {
      filters.push(`eventIdx: ${eventIdx}`);
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getTransfer: Provided eventIdx must be a positive number.`);
    }

    const query = generateObjectQuery('getTransfer', genericTransferFields, filters);
    const result = await adapter.socket.query(query) as { getTransfer: pst.Transfer };
    const transfer = result.getTransfer;
    if (isObject(transfer)) {
      return transfer;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getTransfer: Returned response is invalid.`);
    }
  };


const createTransfersFilters = (transfersFilters?: TransfersFilters): string[] => {
  const filters: string[] = [];

  if (transfersFilters && isObject(transfersFilters)) {
    const fromMultiAddressAccountId = transfersFilters.fromMultiAddressAccountId;
    const toMultiAddressAccountId = transfersFilters.toMultiAddressAccountId;

    if (isDefined(fromMultiAddressAccountId)) {
      if (isString(fromMultiAddressAccountId)) {
        filters.push(`fromMultiAddressAccountId: "${fromMultiAddressAccountId as string}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Transfers: Provided fromMultiAddressAccountId must be a non-empty string.');
      }
    }

    if (isDefined(toMultiAddressAccountId)) {
      if (isString(toMultiAddressAccountId)) {
        filters.push(`toMultiAddressAccountId: "${toMultiAddressAccountId as string}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Transfers: Provided toMultiAddressAccountId must be a non-empty string.');
      }
    }
  } else if (isDefined(transfersFilters)) {
    throw new Error('[PolkascanExplorerAdapter] Transfers: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getTransfers = (adapter: Adapter) =>
  async (transfersFilters?: TransfersFilters, pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Transfer>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = createTransfersFilters(transfersFilters);
    const query = generateObjectsListQuery('getTransfers', genericTransferFields, filters, pageSize, pageKey);
    const result = await adapter.socket.query(query) as { getTransfers: pst.ListResponse<pst.Transfer> };
    const transfers = result.getTransfers.objects;

    if (isArray(transfers)) {
      return result.getTransfers;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getTransfers: Returned response is invalid.`);
    }
  };


export const subscribeNewTransfer = (adapter: Adapter) =>
  async (...args: (((transfer: pst.Transfer) => void) | TransfersFilters | undefined)[]): Promise<() => void> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((transfers: pst.Transfer) => void));
    if (!callback) {
      throw new Error(`[PolkascanExplorerAdapter] subscribeNewTransfer: No callback function is provided.`);
    }

    let filters: string[] = [];
    if (isObject(args[0])) {
      filters = createTransfersFilters(args[0] as TransfersFilters);
    }

    const query = generateSubscription('subscribeNewTransfer', genericTransferFields, filters);

    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result: { subscribeNewTransfer: pst.Transfer }) => {
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
