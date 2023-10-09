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
import { map, Observable, throwError } from 'rxjs';
import { types } from '@polkadapt/core';

// export type XXMetadataInput = {
//   blockHash: string;
//   blockHeight: number;
//   specName: string;
//   specVersion: number;
// }[];

const identifiers = ['specName', 'specVersion'];

// export const getRuntimesBase = (adapter: Adapter, specName?: string, specVersion?: number, limit?: number): Observable<types.Runtime[]> =>
//   throwError(() => `Functionality for getRuntime, getRuntimes and  not implemented.`);
//
// export const getRuntime = (adapter: Adapter) => {
//   const fn = (specName: string, specVersion: number): Observable<types.Runtime> => getRuntimesBase(adapter, specName, specVersion, 1).pipe(
//     map(runtimes => runtimes[0])
//   );
//   fn.identifiers = identifiers;
//   return fn;
// };
//
// export const getRuntimes = (adapter: Adapter) => {
//   const fn = (pageSize?: number): Observable<types.Runtime[]> => getRuntimesBase(adapter, undefined, undefined, pageSize);
//   fn.identifiers = identifiers;
//   return fn;
// };
//
// export const getLatestRuntime = (adapter: Adapter) => {
//   const fn = (): Observable<types.Runtime> => getRuntimesBase(adapter, undefined, undefined, 1).pipe(
//     map(runtimes => runtimes[0])
//   );
//   fn.identifiers = identifiers;
//   return fn;
// };
