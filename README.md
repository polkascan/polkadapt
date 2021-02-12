# PolkADAPT Project Workspace

**If you wish to use PolkADAPT in your application, please follow the installation instructions below.**

PolkADAPT is an Augmented Data Application Protocol Technology for Multichains that aims to be a framework that offers a data abstraction layer for applications by providing one single multichain namespace.

> For example, you can get realtime data from a Kusama RPC node, augmented with historical data from [Polkascan.io](https://polkascan.io/) and KSM-USD price information from a third party's API using the commands provided by the PolkADAPT system.

PolkADAPT can be used in any browser-based or NodeJS application and any application framework, such as React, Angular, Vue, etc.

## About this repository ##

You're looking at the project workspace and source repository for the @polkadapt NPM packages. This workspace was generated with [Angular](https://angular.io/guide/creating-libraries) to leverage the testing and building tools that come with it.

**Note:** You don't need Angular to use PolkADAPT in your application. The @polkadapt packages are not tied to any application development framework.

If you wish to build the packages yourself, install the workspace development dependencies (`npm install`) and build the libraries with the command `npm run build`.

## Generic installation instructions

1. Add at least the following packages to your project's `package.json` "dependencies":
    ```json
    {
      "@polkadapt/core": "latest",
      "@polkadapt/substrate-rpc": "latest",
      "@polkadot/api": "latest",
      "buffer": "^4.9.2"
    }
    ```
    If you wish, you can add more adapters to the list, e.g.:
    ```json
    {
      "@polkadapt/polkascan": "latest"
    }
    ```

2. If you're using TypeScript in your project, add the following code to the "compilerOptions" in `tsconfig.json`:
    ```json
    {
      "moduleResolution": "node",
      "allowSyntheticDefaultImports": true,
      "types": ["node"],
      "target": "es2015",
      "module": "es2020",
      "lib": [
        "es2018",
        "dom"
      ],
      "paths": {
        "@polkadot/api": [
          "node_modules/@polkadot/api"
        ],
        "@polkadapt/core": [
          "node_modules/@polkadapt/core"
        ],
        "crypto": [
          "node_modules/crypto-browserify"
        ],
        "stream": [
          "node_modules/stream-browserify"
        ]
      }
    }
    ```
   
3. Add the following code somewhere early in your application bootstrapping process (Angular projects: `polyfills.ts`):
    ```ts
    // Crypto browserify uses global in NodeJS, use window instead.
    (window as any).global = window;
    
    // Add browserify version of buffer, installed as dependency.
    (window as any).Buffer =  (window as any).buffer || require('buffer').Buffer;
    
    // Add browserify version of process, already installed as sub-dependency.
    (window as any).process = require('process');
    ```

## Additional instructions for Angular projects

1. First follow the generic instructions above.
   
2. Add the code `"types": ["node"]` to `tsconfig.app.json` and `tsconfig.spec.json`.

## Usage (example)

```ts
import { Polkadapt } from '@polkadapt/core';
import * as polkascan from '@polkadapt/polkascan';
import * as substrate from '@polkadapt/substrate-rpc';
import * as currency from '3rdparty/currency-conversion-adapter';

// Merge the Api types from the adapters we want to use.
type AugmentedApi = substrate.Api & polkascan.Api & currency.Api;

// Instantiate the adapters:
const adapters = [
  new substrate.Adapter({
    chain: 'kusama',
    providerURL: 'wss://kusama-rpc.polkadot.io'
  }),
  new polkascan.Adapter({
    chain: 'kusama',
    apiEndpoint: 'https://host-xx.polkascan.io:8009/graphql',
    wsEndpoint: 'ws://host-xx.polkascan.io:8009/graphql-ws'
  }),
  new currency.Adapter()
];

// Instantiate PolkADAPT:
const api: Polkadapt<AugmentedApi> = new Polkadapt();

api.register(...adapters);

// Wait for any initialization to finish, 
// e.g. Polkadot.js connecting to an RPC node using a websocket:
await api.ready();

// Now we can run commands on PolkADAPT. These are basically Polkadot.js 
// (ApiPromise) calls, augmented by the other adapters.

// In this case, the following call will return an augmented result, 
// containing data from both the RPC node and Polkascan API:
const account = await api.run('kusama').query.system.account('some hash');
```
