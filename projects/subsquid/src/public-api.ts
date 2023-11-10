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
 * Public API Surface of subsquid
 */

export * from './lib/subsquid';
import type * as types from './lib/subsquid.types';
export * as types from './lib/subsquid.types';

/* eslint-disable @typescript-eslint/no-empty-interface */
declare module '@polkadapt/core/augmented-types' {
    interface Block extends types.Block {}
    interface Event extends types.Event {}
    interface AccountEvent extends types.AccountEvent {}
    interface Extrinsic extends types.Extrinsic {}
    // interface ChainProperties extends types.ChainProperties {}
    interface Runtime extends types.Runtime {}
    interface ChainStatistics extends types.ChainStatistics {}
    interface Transfer extends types.Transfer {}
    interface Account extends types.Account {}
}
