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

import { Adapter, Where } from '../subsquid';
import { map, Observable } from 'rxjs';
import { types } from '@polkadapt/core';

export type ArchiveMetadataInput = {
  blockHash: string;
  blockHeight: number;
  specName: string;
  specVersion: number;
}[];

export const getRuntimesBase = (adapter: Adapter, specName?: string, specVersion?: number, limit?: number): Observable<types.Runtime[]> => {
  const where: Where = {};
  if (specName) {
    where['specName_eq'] = specName;
  }
  if (specVersion) {
    where['specVersion_eq'] = specVersion;
  }
  return adapter.queryArchive<ArchiveMetadataInput>(
    'metadata',
    ['blockHash', 'blockHeight', 'specName', 'specVersion'],
    where,
    limit && limit >= 1 && !(specName && specVersion !== undefined) ? 'blockHeight_DESC' : undefined,
    limit
  ).pipe(
    map<ArchiveMetadataInput, types.Runtime[]>(metadata => metadata.map(m => ({
      blockHash: m.blockHash,
      blockNumber: m.blockHeight,
      specName: m.specName,
      specVersion: m.specVersion
    })))
  );
};

export const getRuntime = (adapter: Adapter) =>
  (specName: string, specVersion: number): Observable<types.Runtime> => getRuntimesBase(adapter, specName, specVersion, 1).pipe(
    map(runtimes => runtimes[0])
  );

export const getRuntimes = (adapter: Adapter) =>
  (pageSize?: number): Observable<types.Runtime[]> => getRuntimesBase(adapter, undefined, undefined, pageSize);

export const getLatestRuntime = (adapter: Adapter) =>
  (): Observable<types.Runtime> => getRuntimesBase(adapter, undefined, undefined, 1).pipe(
    map(runtimes => runtimes[0])
  );
