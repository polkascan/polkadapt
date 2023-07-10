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
import { types } from '@polkadapt/core';
import { AccountId32, AccountInfo, Balance, BalanceLock } from '@polkadot/types/interfaces';
import { catchError, combineLatest, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { bool, Data, Option, U32 } from '@polkadot/types';
import { ITuple } from '@polkadot/types-codec/types';
import { u128, Vec } from '@polkadot/types-codec';
import { BN as PolkadotBN, u8aToString } from '@polkadot/util';
import { BN } from 'bn.js'
import { DeriveStakingAccount } from '@polkadot/api-derive/types';

const accountIdentifiers: string[] = ['id'];


export const getAccountIdFromIndex = (adapter: Adapter) =>
  (index: number): Observable<string | null> => {
    if (!Number.isInteger(index)) {
      return throwError(() => new Error('[Substrate adapter] getSS58FromIndex: index is not a number'));
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
  const fn = (accountId: string, blockHash?: string): Observable<types.Account> =>
    from(adapter.apiPromise).pipe(
      switchMap(api => {
        if (api?.query?.system?.account) {
          return (blockHash
            ? api.query.system.account.at(blockHash, accountId)
            : api.query.system.account(accountId)) as Observable<AccountInfo>;
        } else if (api?.query?.balances?.account) {
          return (blockHash
            ? api.query.balances.account.at(blockHash, accountId)
            : api.query.balances.account(accountId)).pipe(
            map((accountData) => ({
              id: accountId,
              data: accountData
            }))
          );
        } else if (api?.query?.balances) {
          // Fallback if system account does not exist.
          return combineLatest(
            ((blockHash
              ? api.query.balances.locks.at(blockHash, accountId)
              : api.query.balances.locks(accountId)) as Observable<BalanceLock[]>).pipe(
              catchError(() => of(null))
            ),
            ((blockHash
              ? api.query.balances.freeBalance.at(blockHash, accountId)
              : api.query.balances.freeBalance(accountId)) as Observable<PolkadotBN>).pipe(
              catchError(() => of(null))
            ),
            ((blockHash
              ? api.query.balances.reservedBalance.at(blockHash, accountId)
              : api.query.balances.reservedBalance(accountId)) as Observable<PolkadotBN>).pipe(
              catchError(() => of(null))
            )
          ).pipe(
            map(([locks, free, reserved]) => {
              const account: types.Account = {
                id: accountId,
                data: {}
              };

              if (free) {
                account.data.free = new BN(free.toString());
              }
              if (reserved) {
                account.data.reserved = new BN(reserved.toString());
              }
              if (locks && locks.length > 0) {
                locks.sort((a, b) => b.amount.sub(a.amount).isNeg() ? -1 : 1);
                account.data.frozen = new BN(locks[0].amount.toString());
              }
              return account;
            })
          );
        }
        return throwError(() => new Error('[Substrate RPC adapter] getAccount: Could not retrieve account.'));
      }),
      map((accountInfo) => {
        if (accountInfo) {
          const account = {
            id: accountId,
            data: {}
          } as types.Account;
          if ((accountInfo as AccountInfo).nonce) {
            account.nonce = (accountInfo as AccountInfo).nonce.toJSON() as number;
          }
          if ((accountInfo as AccountInfo).data) {
            if ((accountInfo as AccountInfo).data.free) {
              account.data.free = new BN((accountInfo as AccountInfo).data.free.toString());
            }
            if ((accountInfo as AccountInfo).data.reserved) {
              account.data.reserved = new BN((accountInfo as AccountInfo).data.reserved.toString());
            }
            if ((accountInfo.data as { frozen: Balance }).frozen) {
              account.data.frozen = new BN((accountInfo.data as { frozen: Balance }).frozen.toString());
            } else if ((accountInfo.data as { feeFrozen: Balance }).feeFrozen || (accountInfo.data as {
              miscFrozen: Balance
            }).miscFrozen) {
              account.data.frozen = new BN(
                BN.max(
                  (accountInfo.data as { feeFrozen: Balance }).feeFrozen,
                  (accountInfo.data as { miscFrozen: Balance }).miscFrozen
                ).toString()
              );
            }
          }
          return account;
        }
        throw new Error('[Substrate RPC adapter] getAccount: Could not retrieve account data.');
      })
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


export const getIdentity = (adapter: Adapter) =>
  (accountId: string): Observable<types.AccountIdentity> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.derive.accounts.identity(accountId)),
    map((identity) => {
      return identity as unknown as types.AccountIdentity
    })
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


export const getAccountInformation = (adapter: Adapter) =>
  (accountId: string): Observable<types.AccountInformation> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.derive.accounts.info(accountId)),
    map((info) => {
      if (info) {
        return {
          accountId: info.accountId && info.accountId.toJSON(),
          accountIndex: info.accountIndex && info.accountIndex.toJSON(),
          identity: info.identity as unknown as types.AccountIdentity,
          nickname: info.nickname
        } as types.AccountInformation;
      }
      return {
        accountId,
        identity: {
          judgements: []
        }
      };
    })
  );


export const getAccountFlags = (adapter: Adapter) =>
  (accountId: string): Observable<types.AccountFlags> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.derive.accounts.flags(accountId)),
    map((flags) => ({
      isCouncil: flags.isCouncil,
      isSociety: flags.isSociety,
      isSudo: flags.isSudo,
      isTechCommittee: flags.isTechCommittee
    }))
  );

export const getAccountBalances = (adapter: Adapter) =>
  (accountId: string): Observable<types.AccountBalances> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.derive.balances.all(accountId)),
    map((balances) => ({
      lockedBalance: new BN(balances.lockedBalance.toString()),
      freeBalance: new BN(balances.freeBalance.toString()),
      reservedBalance: new BN(balances.reservedBalance.toString()),
      availableBalance: new BN(balances.availableBalance.toString())
    }))
  );


// From account.txs PolkadotJS apps Page-accounts
function calcUnbonding(stakingInfo?: DeriveStakingAccount) {
  if (!stakingInfo?.unlocking) {
    return new BN(0);
  }

  const filtered = stakingInfo.unlocking
    .filter(({remainingEras, value}) => value.gt(new BN(0)) && remainingEras.gt(new BN(0)))
    .map((unlock) => unlock.value);
  const total = filtered.reduce((total, value) => total.iadd(value), new BN(0));

  return total;
}

// From address-info.txs PolkadotJS apps Page-accounts
// function calcBonded(stakingInfo?: DeriveStakingAccount, bonded?: boolean | BN[]): [BN, BN[]] {
//   let other: BN[] = [];
//   let own = BN_ZERO;
//
//   if (Array.isArray(bonded)) {
//     other = bonded
//       .filter((_, index) => index !== 0)
//       .filter((value) => value.gt(BN_ZERO));
//
//     own = bonded[0];
//   } else if (stakingInfo && stakingInfo.stakingLedger && stakingInfo.stakingLedger.active && stakingInfo.accountId.eq(stakingInfo.stashId)) {
//     own = stakingInfo.stakingLedger.active.unwrap();
//   }
//
//   return [own, other];
// }

export const getAccountStaking = (adapter: Adapter) =>
  (accountId: string): Observable<types.AccountStaking> => from(adapter.apiPromise).pipe(
    switchMap((api) => api.derive.staking.account(accountId)),
    map((stakingInfo) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
      bonded: stakingInfo.stakingLedger?.active?.unwrap ? new BN(stakingInfo.stakingLedger.active.toString()) : new BN(0),
      redeemable: stakingInfo.redeemable?.toString ? new BN(stakingInfo.redeemable.toString()) : new BN(0),
      unbonding: calcUnbonding(stakingInfo)
    }))
  );
