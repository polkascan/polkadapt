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

import { combineLatestWith, map, throwError } from 'rxjs';
import * as st from '../subsquid.types';
import { Adapter } from '../subsquid';
import { isString } from './helpers';

export type GSMainIdentityInput = {
  id: string;
  display: string;
}[];

export type GSMainIdentitySubInput = {
  id: string;
  name: string;
}[];

export const findAccountsByIdentity = (adapter: Adapter) => {
  const fn = (searchTerm: string) => {
    if (!isString(searchTerm)) {
      return throwError(() => 'Provided identity search term must be a string.');
    }

    return adapter.queryGSMain<GSMainIdentityInput>(
      'identities',
      ['id', 'display'],
      {'display_containsInsensitive': searchTerm},
      'display_ASC',
      10
    ).pipe(
      combineLatestWith(adapter.queryGSMain<GSMainIdentitySubInput>(
        'identitySubs',
        ['id', 'name'],
        {'name_containsInsensitive': searchTerm},
        'name_ASC',
        10
      )),
      map(([identities, identitySubs]) => {
        const items: st.Account[] = [];
        for (const identity of identities) {
          items.push({
            id: identity.id,
            identity: {
              display: identity.display
            }
          });
        }
        for (const sub of identitySubs) {
          items.push({
            id: sub.id,
            identity: {
              display: sub.name
            }
          });
        }
        items.sort((a, b) => a.identity.display.localeCompare(b.identity.display));
        return items;
      })
    );
  };
  fn.identifiers = ['id'];
  return fn;
};
