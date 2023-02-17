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

export type Block = {
  // eslint-disable-next-line id-blacklist
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  datetime: string | null;
  authorAuthorityIndex: number | null;
  authorSlotNumber: number | null;
  authorAccountId: string | null;
  countExtrinsics: number;
  countEvents: number;
  countLogs: number;
  totalFee: number | null;
  totalFeeTreasury: number | null;
  totalFeeBlockAuthor: number | null;
  specName: string;
  specVersion: number;
};
