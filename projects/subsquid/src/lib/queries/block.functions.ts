import { types } from '@polkadapt/core';
import { catchError, filter, map, merge, Observable, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import * as st from '../subsquid.types';
import { Adapter, Where } from '../subsquid';
import { isObject } from './helpers';

export type ArchiveBlockInput = {
  extrinsicsRoot: string;
  hash: string;
  height: number;
  parentHash: string;
  spec: {
    specName: string;
    specVersion: number;
  };
  stateRoot: string;
  timestamp: string;
  validator: string;
}[];

export type GSExplorerBlockInput = {
  height: number;
  extrinsicsCount: number;
  callsCount: number;
  eventsCount: number;
}[];

const identifiers = ['number'];

export const getBlocksBase = (
  adapter: Adapter,
  pageSize?: number,
  hashOrNumber?: string | number,
  fromNumber?: string | number,
  untilNumber?: string | number): Observable<types.Block[]> => {
  const contentType = 'blocks';
  const orderBy = 'id_DESC';

  let where: Where | undefined;
  if (typeof hashOrNumber !== 'undefined') {
    const whereKey = (typeof hashOrNumber === 'string' && hashOrNumber.startsWith('0x')) ? 'hash_eq' : 'height_eq';
    where = {};
    where[whereKey] = hashOrNumber;
  }

  if (typeof fromNumber !== 'undefined') {
    where = {};
    where['height_gte'] = fromNumber;
  }

  if (typeof untilNumber !== 'undefined') {
    where = {};
    where['height_lte'] = untilNumber;
  }

  return merge(
    adapter.queryArchive<ArchiveBlockInput>(
      contentType,
      ['extrinsicsRoot', 'hash', 'height', 'parentHash', {spec: ['specName', 'specVersion']}, 'stateRoot', 'timestamp', 'validator'],
      where,
      orderBy,
      pageSize
    ).pipe(
      map(blocks => blocks.map<st.ArchiveBlockOutput>(block => ({
        // eslint-disable-next-line id-blacklist
        number: block.height,
        hash: block.hash,
        parentHash: block.parentHash,
        stateRoot: block.stateRoot,
        extrinsicsRoot: block.extrinsicsRoot,
        datetime: block.timestamp,
        authorAccountId: block.validator,
        specName: block.spec.specName,
        specVersion: block.spec.specVersion,
        complete: 1
      })))
    ),
    adapter.queryGSExplorer<GSExplorerBlockInput>(
      contentType,
      ['height', 'callsCount', 'eventsCount', 'extrinsicsCount'],
      where,
      orderBy,
      pageSize
    ).pipe(
      map(blocks => blocks.map<st.GSExplorerBlockOutput>(block => ({
        // eslint-disable-next-line id-blacklist
        number: block.height,
        countCalls: block.callsCount,
        countEvents: block.eventsCount,
        countExtrinsics: block.extrinsicsCount
      })))
    )
  );
};

export const getBlock = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number) =>
    getBlocksBase(adapter, 1, hashOrNumber).pipe(
      map(blocks => blocks[0])
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getLatestBlock = (adapter: Adapter) => {
  const fn = () =>
    getBlocksBase(adapter, 1).pipe(
      map(blocks => blocks[0])
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocks = (adapter: Adapter) => {
  const fn = (pageSize?: number) =>
    getBlocksBase(adapter, pageSize);
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocksFrom = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number, pageSize?: number) =>
    // Find number for block hash;
    getBlocksBase(adapter, 1, hashOrNumber).pipe(
      take(1),
      map((blocks) => {
        if (blocks[0]) {
          return blocks[0];
        }
        throw new Error('[SubsquidAdapter] getBlocksFrom: Could not find block.');
      }),
      switchMap((block) =>
        getBlocksBase(adapter, pageSize, undefined, block.number)
      )
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocksUntil = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number, pageSize?: number) =>
    getBlocksBase(adapter, 1, hashOrNumber).pipe(
      take(1),
      map((blocks) => {
        if (blocks[0]) {
          return blocks[0];
        }
        throw new Error('[SubsquidAdapter] getBlocksUntil: Could not find block.');
      }),
      switchMap((block) =>
        getBlocksBase(adapter, pageSize, undefined, undefined, block.number)
      )
    );
  fn.identifiers = identifiers;
  return fn;
};

export const subscribeNewBlock = (adapter: Adapter) => {
  let height: number | undefined;
  let ignoreHeight: number | undefined;

  const fn = () => timer(0, 6000).pipe(
    switchMap(() =>
      getBlocksBase(adapter, 1).pipe(
        filter((blocks) => blocks && blocks[0] && (blocks[0].number as number) !== ignoreHeight),
        switchMap((blocks) => {
          if (blocks.length === 1) {
            const prevHeight = height;
            const latestBlock = blocks[0];
            const latestBlockNumber = latestBlock.number as number;

            if (prevHeight !== undefined && latestBlockNumber - prevHeight > 1) {
              // Missed multiple blocks, retrieve and emit individually.
              ignoreHeight = latestBlockNumber;
              const from = prevHeight + 1;
              const pageSize = latestBlockNumber - prevHeight;
              return getBlocksBase(adapter, pageSize, undefined, from).pipe(
                filter((latestBlocks) => latestBlocks.length > 0),
                switchMap((latestBlocks) => of(...latestBlocks.reverse())),
                tap(() => {
                  if (height && height < latestBlockNumber) {
                    height = latestBlockNumber;
                  }
                })
              );
            }
            height = latestBlockNumber;
            return of(latestBlock);
          }
          return of(undefined);
        }),
        catchError((e) => {
          console.error('[SubsquidAdapter] subscribeNewBlock', e);
          return throwError(() => new Error('[SubsquidAdapter] subscribeNewBlock: Latest block not found'));
        })
      )),
    filter((b): b is types.Block => isObject(b))
  );
  fn.identifiers = identifiers;
  return fn;
};
