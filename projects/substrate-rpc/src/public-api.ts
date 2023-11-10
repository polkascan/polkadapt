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

/*
 * Public API Surface of substrate-rpc
 */

export * from './lib/substrate-rpc';
import type * as types from './lib/substrate-rpc.types';

/* eslint-disable @typescript-eslint/no-empty-interface */
declare module '@polkadapt/core/augmented-types' {
  interface Header extends types.Header {}
  interface Block extends types.Block {}
  interface Account extends types.Account {}
  interface AccountIdentity extends types.AccountIdentity {}
  interface AccountInformation extends types.AccountInformation {}
  interface AccountFlags extends types.AccountFlags {}
  interface AccountStaking extends types.AccountStaking {}
  interface AccountBalances extends types.AccountBalances {}
  interface ChainProperties extends types.ChainProperties {}
  interface Event extends types.Event {}
  interface Extrinsic extends types.Extrinsic {}
  interface Runtime extends types.Runtime {}
  interface RuntimePallet extends types.RuntimePallet {}
  interface RuntimeCall extends types.RuntimeCall {}
  interface RuntimeCallArgument extends types.RuntimeCallArgument {}
  interface RuntimeEvent extends types.RuntimeEvent {}
  interface RuntimeEventAttribute extends types.RuntimeEventAttribute {}
  interface RuntimeStorage extends types.RuntimeStorage {}
  interface RuntimeConstant extends types.RuntimeConstant {}
  interface RuntimeErrorMessage extends types.RuntimeErrorMessage {}
}
export * as types from './lib/substrate-rpc.types';
