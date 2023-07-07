# PolkADAPT Core Library

PolkADAPT is an Augmented Data Application Protocol Technology that aims to be a framework to serve as a data abstraction layer and piping mechanism for applications by providing one single function call namespace and smart data augmentation.

> For example, you can get realtime data from a Kusama RPC node, augmented with indexed data from [Polkascan.io](https://polkascan.io/) and KSM-USD price information from a third party's API using the commands provided by the PolkADAPT system.

PolkADAPT is a stand-alone library, using RxJS data streams. Use it in your browser-based or NodeJS application. It works with any application framework, such as React, Angular, Vue, etc.

Tip! Check out the [unit tests](https://github.com/polkascan/polkadapt/blob/main/projects/core/src/lib/core.spec.ts) for a complete overview of its capabilities.

## Generic installation instructions

1. Add at least the following packages to your project's `package.json` "dependencies":
    ```json
    {
      "@polkadapt/core": "^2.0.0",
      "@polkadapt/substrate-rpc": "^2.0.0",
      "@polkadot/api": "^10.9.1",
      "buffer": "^6.0.3",
      "crypto": "npm:crypto-browserify@^3.12.0",
      "stream": "npm:stream-browserify@^3.0.0"
    }
    ```
    If you wish, you can add more adapters to the list, e.g.:
    ```json
    {
      "@polkadapt/polkascan-explorer": "^2.0.0",
      "@polkadapt/subsquid": "^1.0.0",
      "@polkadapt/coingecko": "^2.0.0"
    }
    ```
   
2. Add the following to the `package.json` "devDependencies":
    ```json
    {
        "@polkadot/types": "^10.9.1"
    }
    ```

3. If you're using TypeScript in your project, add the following code to the "compilerOptions" in `tsconfig.json`:
    ```json
    {
      "moduleResolution": "node",
      "allowSyntheticDefaultImports": true,
      "target": "es2017",
      "module": "es2020",
      "lib": [
        "es2020",
        "dom"
      ]
    }
    ```
   
4. Add the following code somewhere early in your application bootstrapping process (in Angular projects: `src/polyfills.ts`):
    ```ts
    // Crypto browserify uses global in NodeJS, use window instead.
    (window as any).global = window;
    
    // Add browserify version of buffer, installed as dependency.
    (window as any).Buffer =  (window as any).buffer || require('buffer').Buffer;
    
    // Add browserify version of process, already installed as sub-dependency.
    (window as any).process = require('process');
    ```

## Usage

The PolkADAPT library facilitates interaction with a Substrate network (e.g. Polkadot) and its various data providers. Below is an example demonstrating how to retrieve and process data using PolkADAPT.

```ts
// Import PolkADAPT and various adapters from the respective packages
import { Polkadapt } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as explorer from '@polkadapt/polkascan-explorer';
import * as coingecko from '@polkadapt/coingecko';
import * as subsquid from '@polkadapt/subsquid';

// Merge the Api types from the adapters to create a comprehensive interface.
type AugmentedApi = substrate.Api & explorer.Api & coingecko.Api & subsquid.Api;

// Define the chain name. This could be any string, but it should be consistent 
// across all adapters.
const chainName = 'whatever';

// Instantiate the adapters using their respective constructors. 
// Remember to replace the placeholders with your actual URLs.
const adapters = [
  new substrate.Adapter({
    chain: chainName,
    providerURL: 'wss://your-substrate-rpc-node'
  }),
  new explorer.Adapter({
    chain: chainName,
    wsEndpoint: 'wss://your-self-hosted-polkascan-explorer-api-host/graphql-ws'
  }),
  new coingecko.Adapter({
    chain: chainName,
    apiEndpoint: 'https://api.coingecko.com/api/v3/',
    coinId: 'coingecko-coinId-for-this-chain'
  }),
  new subsquid.Adapter({
    chain: chainName,
    archiveUrl: 'https://polkadot.explorer.subsquid.io/graphql',
    explorerUrl: 'https://squid.subsquid.io/polkadot-explorer/graphql',
    giantSquidExplorerUrl: 'https://squid.subsquid.io/gs-explorer-polkadot/graphql',
    giantSquidMainUrl: 'https://squid.subsquid.io/gs-main-polkadot/graphql',
    balancesUrl: 'https://squid.subsquid.io/polkadot-balances/graphql'
  })
];

// Instantiate PolkADAPT with the type as AugmentedApi.
const api: Polkadapt<AugmentedApi> = new Polkadapt();

// Register all the adapters with the api.
api.register(...adapters);

// Now you can execute commands on PolkADAPT. Check each adapter's API 
// documentation for a list of available calls.
```

PolkADAPT returns results in two modes:

1.  **Observable results mode:** The API calls return an Observable for each individual item. Adapters implementing the API call will return their portion of the results, which will be used to augment each item. The item Observable will then emit the next iteration. For example, here is how you retrieve a single block and subscribe to its data:
    ```ts
    api.run().getBlock(123456).pipe(
      switchMap(observableBlock => observableBlock) // Switch to the result Observable.
    ).subscribe(block => {
      // For every adapter that returns data for this block, the block data will be augmented
      // and emitted to this result Observable. The Observable completes after all adapters have returned their data.
      console.log('Next block iteration:', block);
    });
    ```
    If the result of an API call is an Array of items, then it will be presented as an Array of Observables containing each item.
    ```ts
    api.run().getBlocksFrom(123456).pipe(
      // Switch to a combination of all result Observables in the Array.
      switchMap(obsBlocks => obsBlocks.length ? combineLatest(obsBlocks) : of([]))
    ).subscribe(blocks => {
      // As each adapter returns data for these blocks, the blocks are augmented and emitted.
      console.log('Next iteration of the Array of blocks:', blocks);
    });
    ```

2.  **Direct results mode:** If you don't want to deal with Observable result items, you can set `observableResults` to `false` when calling `run()`. The results will then be directly emitted. For example, here is how you can get a single block: 
    ```ts
    api.run({observableResults: false}).getBlock(123456).subscribe(block => {
      console.log('Next block iteration:', block);
    });
    ```
    For multiple items:
    ```ts
    api.run({observableResults: false}).getBlocksFrom(123456).subscribe(blocks => {
        console.log('Next iteration of the Array of blocks:', blocks);
    });
    ```

Remember to unsubscribe from Observables when you're done to prevent memory leaks.
