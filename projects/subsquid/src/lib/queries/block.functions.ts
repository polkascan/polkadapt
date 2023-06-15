import { types } from '@polkadapt/core';
import { map, merge, Observable, switchMap, take } from 'rxjs';
import * as st from '../subsquid.types';
import { Adapter, Where } from '../subsquid';

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
        throw new Error('[Subsquid adapter] getBlocksFrom :Could not find block.');
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
        throw new Error('[Subsquid adapter] getBlocksUntil :Could not find block.');
      }),
      switchMap((block) =>
        getBlocksBase(adapter, pageSize, undefined, undefined, block.number)
      )
    );
    // Find number for block hash;
  fn.identifiers = identifiers;
  return fn;
};
