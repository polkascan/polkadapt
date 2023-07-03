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

import { types } from '@polkadapt/core';
import { map, Observable } from 'rxjs';
import { Adapter } from '../substrate-rpc';
import { getMetadataForSpecVersion } from './helpers';

const identifiers = ['specName', 'specVersion', 'pallet', 'errorName'];

export const getRuntimeErrorMessages = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeErrorMessage[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeErrorMessages: types.RuntimeErrorMessage[] = [];
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toString() !== pallet) {
            continue;
          }
          const errorsType = p.errors.value.type ?
            metadataTypes[p.errors.value.type.toNumber()].type : null;
          if (errorsType) {
            const errors = errorsType.def.asVariant.variants;
            for (const e of errors) {
              runtimeErrorMessages.push({
                specName,
                specVersion,
                pallet: p.name.toString(),
                errorName: e.name.toString(),
                documentation: e.docs.toArray().map(d => d.toString()).join('\n'),
                errorIdx: e.index.toNumber()
              });
            }
          }
        }
        runtimeErrorMessages.sort((a, b) => a.pallet.localeCompare(b.pallet) || a.errorName.localeCompare(b.errorName));
        return runtimeErrorMessages;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimeErrorMessage = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, errorName: string): Observable<types.RuntimeErrorMessage> =>
    getRuntimeErrorMessages(adapter)(specName, specVersion, pallet).pipe(
      map(errors => {
        const runtimeErrorMessage = errors.find(s => s.errorName === errorName);
        if (!runtimeErrorMessage) {
          throw new Error('Error Message not found');
        }
        return runtimeErrorMessage;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

