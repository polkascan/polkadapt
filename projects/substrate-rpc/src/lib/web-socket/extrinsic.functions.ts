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

import { Adapter } from '../substrate-rpc';
import { from, map, switchMap, throwError } from 'rxjs';
import { camelToSnakeCase, capitalize, isPositiveNumber } from './helpers';
import { getBlockBase } from './block.functions';

const identifiers = ['blockNumber', 'extrinsicIdx'];

export const getExtrinsic = (adapter: Adapter) => {
  const fn = (blockNumber: number, extrinsicIdx: number) => {

    if (!isPositiveNumber(blockNumber)) {
      return throwError(() => 'Provided block number must be a positive number.');
    }

    if (!isPositiveNumber(extrinsicIdx)) {
      return throwError(() => 'Provided extrinsicIdx must be a positive number.');
    }

    return from(adapter.apiPromise).pipe(
      switchMap(() => getBlockBase(adapter)(blockNumber)),
      map((block) => {
        if (block && block.extrinsics && block.extrinsics[extrinsicIdx]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const extrinsic = block.extrinsics[extrinsicIdx];
          if (extrinsic) {
            let callArguments: unknown[] | null = null;
            if (extrinsic.method && extrinsic.method.args) {
              if (Array.isArray(extrinsic.method.args)) {
                callArguments = extrinsic.method.args.map((a) => a.toJSON());
              }
            }

            let callModule: string | null = null
            let callName: string | null = null;

            if (extrinsic.method?.method) {
              callName = camelToSnakeCase(extrinsic.method.method);
            }
            if (extrinsic.method?.section) {
              callModule = capitalize(extrinsic.method.section);
            }

            const result = {
              blockNumber: block.number,
              extrinsicIdx: extrinsicIdx,
              hash: extrinsic.hash?.toJSON() || null,
              version: extrinsic.version,
              nonce: extrinsic.nonce?.toJSON() as number || null,
              era: extrinsic.era?.toJSON() as number || null,
              callModule: callModule,
              callName: callName,
              callArguments: callArguments,
              signed: extrinsic.isSigned ? 1 : 0,
              multiAddressAccountId: extrinsic.isSigned ? extrinsic.signer.value.toJSON() as string: null,
              signature: extrinsic.signature.isEmpty === false ? extrinsic.signature?.toJSON() : null || null,
              tip: extrinsic.tip.toJSON() as number || null,
              blockDatetime: block.datetime,
              blockHash: block.hash,
              specName: block.specName,
              specVersion: block.specVersion
            }
            return result;
          }
        }
        throw new Error(`[Substrate RPC Adapter] getExtrinsic could find requested event.`)
      })
    )
  }
  fn.identifiers = identifiers;
  return fn;

}
