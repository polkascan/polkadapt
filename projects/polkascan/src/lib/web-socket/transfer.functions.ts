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
  isPositiveNumber
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


export const getTransfers = (adapter: Adapter) => {
  return async (pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Transfer>> => {

    const query = generateObjectsListQuery('getTransfers', genericTransferFields, undefined, pageSize, pageKey);

    let result;
    let transfers: pst.Transfer[];
    try {
      result = adapter.socket ? await adapter.socket.query(query) : {};
      transfers = result.getTransfers.objects;
    } catch (e) {
      throw new Error(e);
    }
    if (isArray(transfers)) {
      return result.getTransfers;
    } else {
      throw new Error(`[PolkascanAdapter] getTransfers: Returned response is invalid.`);
    }
  };
};


export const subscribeNewTransfer = (adapter: Adapter) => {
  return async (...args: ((transfer: pst.Transfer) => void)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewTransfer: No callback function is provided.`);
    }

    const query = generateSubscription('subscribeNewTransfer', genericTransferFields);

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
