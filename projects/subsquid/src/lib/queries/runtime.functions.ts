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
import { map, Observable, ReplaySubject } from 'rxjs';
import { types } from '@polkadapt/core';

export type RuntimeStorageObject = {
    blockHash: string;
    blockHeight: number;
    specName: string;
    specVersion: number;
}[];

const identifiers = ['specName', 'specVersion'];

let runtimesStorage: ReplaySubject<types.Runtime[]> | undefined;

export const getRuntimesBase = (adapter: Adapter): Observable<types.Runtime[]> => {
    if (!runtimesStorage) {
        runtimesStorage = new ReplaySubject<types.Runtime[]>(1);
        adapter.queryMetaData().subscribe({
            next: (ra) => {
                if (runtimesStorage) {
                    runtimesStorage.next(ra.sort((r, rr) => rr.specVersion - r.specVersion));
                }
            },
            error: (err) => {
                if (runtimesStorage) {
                    runtimesStorage.error(err);
                }
            }
        })
    }

    return runtimesStorage.asObservable();
}

export const getRuntime = (adapter: Adapter) => {
    const fn = (specName: string, specVersion: number): Observable<types.Runtime> => getRuntimesBase(adapter).pipe(
        map(runtimes => {
            const runtime = runtimes.find((r) => r.specName === specName && r.specVersion === specVersion);
            if (runtime) {
                return runtime;
            }
            throw new Error('[SubSquid Adapter] getRuntime Could not find requested runtime.');
        })
    );
    fn.identifiers = identifiers;
    return fn;
};

export const getRuntimes = (adapter: Adapter) => {
    const fn = (): Observable<types.Runtime[]> => getRuntimesBase(adapter);
    fn.identifiers = identifiers;
    return fn;
};

export const getLatestRuntime = (adapter: Adapter) => {
    const fn = (): Observable<types.Runtime> => getRuntimesBase(adapter).pipe(
        map(runtimes => runtimes[0])
    );
    fn.identifiers = identifiers;
    return fn;
};
