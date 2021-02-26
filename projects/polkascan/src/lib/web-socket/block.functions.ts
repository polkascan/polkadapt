import { Adapter } from '../polkascan';
import { Block } from '../polkascan.types';

const genericBlockFields = 'id, hash, parentHash, stateRoot, extrinsicsRoot, countExtrinsics, countEvents';

const isBlockHash = (hash: any): boolean => {
  return (typeof hash === 'string' || (hash as any) instanceof String) && hash.startsWith('0x');
};

const isBlockNumber = (nr: any): boolean => {
  return Number.isInteger(nr) && nr >= 0;
};


export const getBlock = (adapter: Adapter) => {
  return async (hashOrNumber?: string | number): Promise<Block> => {
    let filter;
    if (isBlockHash(hashOrNumber)) {
      // Fetch specific block;
      filter = `filters: { hashEq: "${hashOrNumber}" }`;
    } else if (isBlockNumber(hashOrNumber)) {
      filter = `filters: { id: ${hashOrNumber} }`;
    }

    const query = `query { getBlock${filter ? `(${filter})` : ''} { ${genericBlockFields} } }`;

    try {
      const result = await adapter.socket.query(query);
      const block = result.getBlock;
      block.number = parseInt(block.id as any, 10); // Fix when backend contains number as attribute
      return block;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getBlocksFrom = (adapter: Adapter) => {
  return async (hashOrNumber: string | number, pageSize?: number, pageNr?: number): Promise<Block[]> => {
    // TODO FIX PAGE SIZE, PAGE NR.
    let filter = '';

    if (isBlockHash(hashOrNumber)) {
      filter = `filters: { hashFrom: "${hashOrNumber}" }`;
    } else if (isBlockNumber(hashOrNumber)) {
      filter = `filters: { idGte: ${hashOrNumber} }`;
    } else {
      throw new Error('[PolkascanAdapter] getBlocksFrom: Supplied hashOrNumber must be of type string or number.');
    }

    const query = `query {getBlocks( ${filter}) { ${genericBlockFields} } }`;

    try {
      // @ts-ignore
      const result = await adapter.socket.query(query);
      const blocks: Block[] = result.getBlocks;
      blocks.forEach((block) => block.number = parseInt(block.id as any, 10)); // Fix when backend contains number as attribute.
      return blocks;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getBlocksUntil = (adapter: Adapter) => {
  return async (hashOrNumber: string | number, pageSize?: number, pageNr?: number): Promise<Block[]> => {
    // TODO FIX PAGE SIZE, PAGE NR.
    let filter = '';

    // Fetch specific block;
    if (isBlockHash(hashOrNumber)) {
      filter = `filters: { hashUntil: "${hashOrNumber}" }`;
    } else if (isBlockNumber(hashOrNumber)) {
      filter = `filters: { idLte: ${hashOrNumber} }`;
    } else {
      throw new Error('[PolkascanAdapter] getBlocksUntil: Supplied hashOrNumber must be of type string or number.');
    }

    const query =
      `query { getBlocks(${filter}) { ${genericBlockFields} } }`;

    try {
      const result = await adapter.socket.query(query);
      const blocks: Block[] = result.getBlocks;
      blocks.forEach((block) => block.number = parseInt(block.id as any, 10)); // Fix when backend contains number as attribute.
      return blocks;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const subscribeFinalizedBlocks = (adapter: Adapter) => {
  return async (callback: (block: Block) => void): Promise<() => void> => {
    const query = `subscription { subscribeBlock { ${genericBlockFields} } }`;
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result) => {
      try {
        const block = result.block;
        block.number = parseInt(block.id as any, 10); // Fix when backend contains number as attribute
        callback(block);
      } catch (e) {
        // Ignore.
      }
    });
  };
};


export const getBlockAugmentation = (adapter: Adapter) => {
  return async (hash: string): Promise<any> => {
    if (!isBlockHash(hash)) {
      throw new Error('[PolkascanAdapter] getBlock (augmentation): Hash must be of type string.');
    }

    // Get data from polkascan to augment it to the rpc block.
    const query = `query { getBlock(filters: { hash: "${hash}" }) { id, countExtrinsics, countEvents } }`;
    try {
      const result = await adapter.socket.query(query);
      const block = result.getBlock;
      block.number = parseInt(block.id as any, 10);
      return {block};
    } catch (e) {
      // Ignore failure. We won't augment the block into the rpc fetched block;
      return {};
    }
  };
};
