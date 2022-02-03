# PolkADAPT Substrate RPC Adapter

A PolkADAPT plug-in to communicate with a Substrate Node through the Polkadot.js library. The PolkADAPT Substrate RPC Adapter provides a hierarchical base structure within the multichain namespace offered by PolkADAPT. Acting as the base data-source for PolkADAPT, the Substrate RPC Adapter serves all on-chain data to PolkADAPT consumers (such as: Polkascan UI) by means of proxying multiple instances of the PolkadotJS API. PolkADAPT users can decide which particular chain to connect to and the Adapter will register the instances in the multichain namespace and relay communications to the proper channel.

For general information and installation instructions, see the [README](https://github.com/polkascan/polkadapt/tree/main/projects/core#readme) file of the `@polkadapt/core` package.
