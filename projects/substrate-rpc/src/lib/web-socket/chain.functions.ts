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
import { Adapter } from '../substrate-rpc';
import { catchError, combineLatest, from, map, Observable, of, switchMap, take } from 'rxjs';
import { ApiRx } from '@polkadot/api';


export const getChainProperties = (adapter: Adapter) =>
  (): Observable<types.ChainProperties> =>
    from(adapter.apiPromise).pipe(
      switchMap((api: ApiRx) =>
        combineLatest([
          of(api.registry?.chainSS58 as number || null).pipe(
            catchError(() => of(null))
          ),
          of(api.registry?.chainDecimals || null).pipe(
            catchError(() => of(null))
          ),
          of(api.registry?.chainTokens || null).pipe(
            catchError(() => of(null))
          ),
          api.rpc?.system?.name().pipe(
            take(1),
            map((name) => name.toString()),
            catchError(() => of(null))
          ) || of(null),
          of(api.runtimeVersion?.specName || null).pipe(
            take(1),
            map((name) => name.toString()),
            catchError(() => of(null))
          ),
          of(api.consts?.babe?.expectedBlockTime || null).pipe(
            map((blocktime) => blocktime.toJSON() as number),
            catchError(() => {
              return of(null)
            })
          ),
          of(api)
        ])
      ),
      switchMap((properties) => {
        if (!properties[0] || !properties[1] || !properties[2]) {
          return combineLatest([
            of(properties),
            properties[6].rpc.system.properties().pipe(
              take(1)
            )
          ]).pipe(
            map(([props, fetchedProps]) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if ((fetchedProps.ss58Format || (fetchedProps as any).ss58Prefix).isSome) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                props[0] = (fetchedProps.ss58Format || (fetchedProps as any).ss58Prefix).toJSON() as number;
              }
              if (fetchedProps.tokenDecimals && fetchedProps.tokenDecimals.isSome) {
                props[1] = fetchedProps.tokenDecimals.toJSON() as number[];
              }
              if (fetchedProps.tokenSymbol && fetchedProps.tokenSymbol.isSome) {
                props[2] = fetchedProps.tokenSymbol.toJSON() as string[];
              }
              return props;
            })
          );
        } else {
          return of(properties);
        }
      }),
      map(([chainSS58, chainDecimals, chainTokens, systemName, specName, blockTime]) =>
        ({
          chainSS58,
          chainDecimals,
          chainTokens,
          systemName,
          specName,
          blockTime
        })
      )
    );
