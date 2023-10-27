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

import { Adapter } from '../subsquid';
import { Observable, throwError } from 'rxjs';
import { types } from '@polkadapt/core';


// export type XXChainInfoInput = {
//   name: string;
//   prefix: number;
//   tokens: {
//     decimals: string;
//     symbol: string;
//   }[];
//   specVersion: string;
//   specName: string;
// };

export const getChainProperties = (adapter: Adapter) =>
  (): Observable<any> =>
    throwError(() => `Functionality for getChainProperties not implemented.`)
