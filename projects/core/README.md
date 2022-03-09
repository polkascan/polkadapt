# PolkADAPT Core Library

PolkADAPT is an Augmented Data Application Protocol Technology that aims to be a framework to serve as a data abstraction layer and piping mechanism for applications by providing one single function call namespace and smart data augmentation.

> For example, you can get realtime data from a Kusama RPC node, augmented with indexed data from [Polkascan.io](https://polkascan.io/) and KSM-USD price information from a third party's API using the commands provided by the PolkADAPT system.

PolkADAPT is a stand-alone library with no dependencies at its core. Use it in your browser-based or NodeJS application. It works with any application framework, such as React, Angular, Vue, etc.

## Generic installation instructions

1. Add at least the following packages to your project's `package.json` "dependencies":
    ```json
    {
      "@polkadapt/core": "^1.0.0",
      "@polkadapt/substrate-rpc": "^1.0.0",
      "@polkadot/api": "^7.3.1",
      "buffer": "^6.0.3",
      "crypto": "npm:crypto-browserify@^3.12.0",
      "stream": "npm:stream-browserify@^3.0.0"
    }
    ```
    If you wish, you can add more adapters to the list, e.g.:
    ```json
    {
      "@polkadapt/polkascan-explorer": "^1.0.0",
      "@polkadapt/coingecko": "^1.0.0"
    }
    ```
   
2. Add the following to the `package.json` "devDependencies":
    ```json
    {
        "@polkadot/types": "^7.3.1"
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

## Usage (example)

```ts
import { Polkadapt } from '@polkadapt/core';
import * as polkascanExplorer from '@polkadapt/polkascan-explorer';
import * as substrate from '@polkadapt/substrate-rpc';

// Merge the Api types from the adapters we want to use.
type AugmentedApi = substrate.Api & polkascanExplorer.Api & currency.Api;

// Instantiate the adapters:
const adapters = [
  new substrate.Adapter({
    chain: 'kusama',
    providerURL: 'wss://kusama-rpc.polkadot.io'
  }),
  new polkascanExplorer.Adapter({
    chain: 'kusama',
    wsEndpoint: 'ws://host-xx.polkascan.io:8009/graphql-ws'
  })
];

// Instantiate PolkADAPT:
const api: Polkadapt<AugmentedApi> = new Polkadapt();

api.register(...adapters);

// Wait for any initialization to finish, 
// e.g. Polkadot.js connecting to a Substrate node using a websocket:
await api.ready();

// Now we can run commands on PolkADAPT. These are basically Polkadot.js 
// (ApiPromise) calls, augmented by the other adapters.

// For example, the following call could return an augmented result,
// containing data from both the Substrate node and Polkascan API:
const account = await api.run('kusama').query.system.account('some input data');
```
