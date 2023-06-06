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


import { Adapter } from '../substrate-rpc';
import { types } from '@polkadapt/core';
import { AccountId32, AccountInfo } from '@polkadot/types/interfaces';
import { from, map, Observable, switchMap, throwError } from 'rxjs';
import { bool, Data, Option, U32 } from '@polkadot/types';
import { ITuple } from '@polkadot/types-codec/types';
import { u128, Vec } from '@polkadot/types-codec';
import { u8aToString } from '@polkadot/util';

const accountIdentifiers: string[] = ['id'];


export const getAccountIdFromIndex = (adapter: Adapter) =>
  (index: number): Observable<string | null> => {
    if (!Number.isInteger(index)) {
      return throwError(new Error('[Substrate adapter] getSS58FromIndex: index is not a number'));
    }

    return from(adapter.apiPromise).pipe(
      switchMap(api =>
        (api.query.indices.accounts(index) as Observable<Option<ITuple<[AccountId32, u128, bool]>>>)),
      map((option) => {
        if (option && option.isSome) {
          return option.value[0].toString();  // return ss58;
        }
        return null;
      })
    );
  };

export const getAccount = (adapter: Adapter) => {
  const fn = (accountId: string): Observable<types.Account> =>
    from(adapter.apiPromise).pipe(
      switchMap(api => api.query.system.account(accountId)),
      map((accountInfo) => ({
          id: accountId,
          nonce: (accountInfo as AccountInfo).nonce.toJSON() as number,
          data: (accountInfo as AccountInfo).data.toJSON()
        } as types.Account)
      )
    );
  fn.identifiers = accountIdentifiers;
  return fn;
};


export const getIndexFromAccountId = (adapter: Adapter) =>
  (accountId: string): Observable<number | null> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.derive.accounts.indexes()),
    map((indexes) => {
      if (indexes && indexes[accountId]) {
        return (indexes[accountId] as U32).toJSON() as number;
      }
      return null;
    })
  );


export const getIdentity = (adapter: Adapter) =>  // TODO FIX TYPING
  (accountId: string): Observable<any> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.query.identity.identityOf(accountId)),
    map((identity) => identity.toJSON())
  );


export const getAccountParentId = (adapter: Adapter) =>
  (accountId: string): Observable<string | null> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.query.identity.superOf(accountId) as Observable<Option<ITuple<[AccountId32, Data]>>>),
    map((parent) => parent && parent.value && parent.value[0]
      ? parent.value[0].toJSON()
      : null
    )
  );


export const getAccountChildrenIds = (adapter: Adapter) =>
  (accountId: string): Observable<string[]> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.query.identity.subsOf(accountId) as Observable<ITuple<[u128, Vec<AccountId32>]>>),
    map((subs) => subs && subs[1]
      ? subs[1].toJSON() as string[]
      : [])
  );


export const getChildAccountName = (adapter: Adapter) =>
  (accountId: string): Observable<string | null> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.query.identity.superOf(accountId) as Observable<Option<ITuple<[AccountId32, Data]>>>),
    map((parent) => {
      if (parent && parent.value && parent.value[1]) {
            const value = parent.value[1];
            return value.isRaw
              ? u8aToString(value.asRaw.toU8a(true))
              : value.isNone
                ? null
                : value.toHex();
          } else {
            return null;
          }
    })
  );

