import { Adapter } from '../polkascan';
import { Block } from '../polkascan.types';

const allBlockFields = 'id, hash, parentHash, stateRoot, extrinsicsRoot, countExtrinsics, countEvents, runtimeId';

export const getBlock = (adapter: Adapter) => {
  return async (hashOrNumber: string | number): Promise<Block> => {
    let filter: string;
    if (typeof hashOrNumber === 'string') {
      // Fetch specific block;
      filter = `(filters: { hash: "${hashOrNumber}" })`;
    } else if (Number.isInteger(hashOrNumber)) {
      filter = `(filters: { id: ${hashOrNumber} })`;
    } else if (hashOrNumber !== undefined) {
      // hashOrNumber is defined but is not a string or integer.
      throw new Error('[PolkascanAdapter] getBlocks: Hash must be a string or Number must be a number.');
    }

    const query = `query { getBlock${filter || ''} { ${allBlockFields} } }`;
    try {
      const result = await adapter.socket.query(query);
      const block = result.getBlock;
      block.number = block.id; // Fix when backend contains number as attribute
      return block;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getBlocksFrom = (adapter: Adapter) => {
  return async (hashOrNumber, pageSize, pageNr): Promise<Block[]> => {
    // TODO FIX PAGE SIZE, PAGE NR.
    const queryArgs: any = {};
    if (hashOrNumber) {
      // Fetch specific block;
      queryArgs.filters = queryArgs.filters || {};
      if (typeof hashOrNumber === 'string') {
        queryArgs.filters.hashFrom = hashOrNumber;
      } else if (Number.isInteger(hashOrNumber)) {
        queryArgs.filters.idGte = hashOrNumber;
      } else {
        throw new Error('[PolkascanAdapter] getBlocksFrom: Hash must be a string or Number must be a number.');
      }
    }

    const queryArgsString = Object.keys(queryArgs).length > 0
      ? `( ${JSON.stringify(queryArgs)} )`
      : '';

    const query =
      `query { getBlocks${queryArgsString} { ${allBlockFields} } }`;

    try {
      // @ts-ignore
      const result = await adapter.socket.query(query);
      const blocks: Block[] = result.getBlocks;
      blocks.forEach((block) => block.number = block.id); // Fix when backend contains number as attribute.
      return blocks;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getBlocksUntil = (adapter: Adapter) => {
  return async (hashOrNumber, pageSize, pageNr): Promise<Block[]> => {
    // TODO FIX PAGE SIZE, PAGE NR.
    const queryArgs: any = {};
    if (hashOrNumber) {
      // Fetch specific block;
      queryArgs.filters = queryArgs.filters || {};
      if (typeof hashOrNumber === 'string') {
        queryArgs.filters.hashUntil = hashOrNumber;
      } else if (Number.isInteger(hashOrNumber)) {
        queryArgs.filters.idLte = hashOrNumber;
      } else {
        throw new Error('[PolkascanAdapter] getBlocksUntil: Hash must be a string or Number must be a number.');
      }
    }

    const queryArgsString = Object.keys(queryArgs).length > 0
      ? `( ${JSON.stringify(queryArgs)} )`
      : '';

    const query =
      `query { getBlocks${queryArgsString} { ${allBlockFields} } }`;

    try {
      const result = await adapter.socket.query(query);
      const blocks: Block[] = result.getBlocks;
      blocks.forEach((block) => block.number = block.id); // Fix when backend contains number as attribute.
      return blocks;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const subscribeFinalizedBlocks = (adapter: Adapter) => {
  return async (callback: (block: Block) => void): Promise<() => void> => {
    const query = `subscription { subscribeBlock { ${allBlockFields} } }`;
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result) => {
      try {
        const block = result.block;
        block.number = block.id; // Fix when backend contains number as attribute
        callback(block);
      } catch (e) {
        // Ignore.
      }
    });
  };
};


export const getBlockAugmentation = (adapter: Adapter) => {
  return async (hash: string): Promise<any> => {
    if (typeof hash !== 'string') {
      throw new Error('[PolkascanAdapter] getBlock (augmentation): Hash must be a string.');
    }

    // Get data from polkascan to augment it to the rpc block.
    const query = `query { getBlock(filters: { hash: "${hash}" }) { id, countExtrinsics, countEvents } }`;
    try {
      const result = await adapter.socket.query(query);
      return result.getBlock;
    } catch (e) {
      // Ignore failure. We won't augment the block into the rpc fetched block;
      return {};
    }
  };
};
