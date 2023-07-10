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
  generateObjectQuery,
  isNumber,
  isObject,
  isString
} from './helpers';
import { map, Observable } from 'rxjs';

const runtimeFields: (keyof pst.Runtime)[] = [
  'specName',
  'specVersion',
  'implName',
  'implVersion',
  'authoringVersion',
  'countCallFunctions',
  'countEvents',
  'countPallets',
  'countStorageFunctions',
  'countConstants',
  'countErrors',
  'blockNumber',
  'blockHash'
];


const identifiers = ['specName', 'specVersion'];

export const getRuntime = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number): Observable<types.Runtime> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getRuntime: Provide the specName (string) and specVersion (number).');
    }

    const query = generateObjectQuery('getRuntime', runtimeFields, filters);
    return createObjectObservable<pst.Runtime>(adapter, 'getRuntime', query).pipe(
      map((r: pst.Runtime) => { // TODO remove if specVersion returns as number.
        if (isObject(r)) {
          r.specVersion = parseInt(r.specVersion as unknown as string, 10);  // TODO hack
        }
        return r;
      })
    );
  };
  fn.identifiers = identifiers;
  return fn;
};

export const getLatestRuntime = (adapter: Adapter) => {
  const fn = (): Observable<types.Runtime> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const query = generateObjectQuery('getLatestRuntime', runtimeFields, []);
    return createObjectObservable<pst.Runtime>(adapter, 'getLatestRuntime', query).pipe(
      map((r: pst.Runtime) => { // TODO remove if specVersion returns as number.
        if (isObject(r)) {
          r.specVersion = parseInt(r.specVersion as unknown as string, 10);  // TODO hack
        }
        return r;
      })
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const getRuntimes = (adapter: Adapter) => {
  const fn = (pageSize?: number): Observable<types.Runtime[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    return createObjectsListObservable<pst.Runtime>(adapter, 'getRuntimes', runtimeFields, undefined, identifiers, pageSize, undefined);
  };
  fn.identifiers = identifiers;
  return fn;
};
