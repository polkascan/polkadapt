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
  isPositiveNumber
} from './helpers';

const genericLogFields = [
  'blockNumber',
  'logIdx',
  'typeId',
  'typeName',
  'data',
  'blockDatetime',
  'blockHash',
  'specName',
  'specVersion',
  'complete'
];


export const getLog = (adapter: Adapter) => {
  return async (blockNumber: number, logIdx: number): Promise<pst.Log> => {
    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error(`[PolkascanAdapter] getLog: Provide a block number (number).`);
    }

    if (!isDefined(logIdx)) {
      throw new Error(`[PolkascanAdapter] getLog: Provide an logIdx (number).`);
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error(`[PolkascanAdapter] getLog: Provided block number must be a positive number.`);
    }

    if (isPositiveNumber(logIdx)) {
      filters.push(`logIdx: ${logIdx}`);
    } else {
      throw new Error(`[PolkascanAdapter] getLog: Provided logIdx must be a positive number.`);
    }

    const query = generateObjectQuery('getLog', genericLogFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const log: pst.Log = result.getLog;
    if (isObject(log)) {
      return log;
    } else {
      throw new Error(`[PolkascanAdapter] getLog: Returned response is invalid.`);
    }
  };
};


export const getLogs = (adapter: Adapter) => {
  return async (pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Log>> => {
    const query = generateObjectsListQuery('getLogs', genericLogFields, undefined, pageSize, pageKey);
    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const logs: pst.Log[] = result.getLogs.objects;

    if (isArray(logs)) {
      return result.getLogs;
    } else {
      throw new Error(`[PolkascanAdapter] getLogs: Returned response is invalid.`);
    }
  };
};


export const subscribeNewLog = (adapter: Adapter) => {
  return async (...args: ((log: pst.Log) => void)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewLog: No callback function is provided.`);
    }

    const query = generateSubscription('subscribeNewLog', genericLogFields);

    // return the unsubscribe function.
    return !adapter.socket ? {} : await adapter.socket.createSubscription(query, (result) => {
      try {
        const log: pst.Log = result.subscribeNewLog;
        if (isObject(log)) {
          callback(log);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
};
