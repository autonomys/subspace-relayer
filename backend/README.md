# Relayer

Node.js app which subscribes to the blocks on the source chain and sends block data to the Subspace chain as an extrinsic.
Transactions are signed and sent by the Subspace chain account, which is derived from the seed.

Seed as well as source chain and target chain URLs can be specified at `.env`:
```
TARGET_CHAIN_URL="ws://127.0.0.1:9944"
ACCOUNT_SEED="//Alice"
CHAIN_CONFIG_PATH=config.json
```

`CHAIN_CONFIG_PATH` needs to point to JSON file with the following structure:
```json
{
    "primaryChain": {
        "downloadedArchivePath": "/path/to/kusama-archive-2021-oct-23",
        "httpUrl": "https://kusama-rpc.polkadot.io",
        "wsUrl": "wss://kusama-rpc.polkadot.io"
    },
    "parachains": [
        {
            "downloadedArchivePath": "/path/to/statemine-archive-2021-oct-23",
            "httpUrl": "https://kusama-statemine-rpc.paritytech.net",
            "paraId": 1000
        },
        {
            "httpUrl": "https://karura.api.onfinality.io/public",
            "paraId": 2000
        },
        {
            "httpUrl": "https://bifrost-parachain.api.onfinality.io/public",
            "paraId": 2001
        },
        {
            "httpUrl": "https://khala.api.onfinality.io/public",
            "paraId": 2004
        },
        {
            "httpUrl": "https://shiden.api.onfinality.io/public",
            "paraId": 2007
        },
        {
            "httpUrl": "https://moonriver.api.onfinality.io/public",
            "paraId": 2023
        },
        {
            "httpUrl": "https://calamari.api.onfinality.io/public",
            "paraId": 2084
        },
        {
            "httpUrl": "https://spiritnet.api.onfinality.io/public",
            "paraId": 2086
        },
        {
            "httpUrl": "https://basilisk.api.onfinality.io/public",
            "paraId": 2090
        },
        {
            "httpUrl": "https://altair.api.onfinality.io/public",
            "paraId": 2088
        },
        {
            "httpUrl": "https://parallel-heiko.api.onfinality.io/public",
            "paraId": 2085
        },
        {
            "httpUrl": "https://kintsugi.api.onfinality.io/public",
            "paraId": 2092
        }
    ]
}
```

Where:
* `downloadedArchivePath` - optional path to downloaded archive of blocks for a particular chain as RocksDB database (can be created with `tools/download-substrate-blocks` script)
* `httpUrl` - HTTP JSON-RPC endpoint URL of a Substrate-based chain
* `wsUrl` - WebSocket JSON-RPC endpoint URL of the main Substrate-based chain (in most cases relay chain like Kusama or Polkadot, but can be used with any other chain too)
* `paraId` - ID of a parachain or parathread under above relay chain

## Scripts
- `npm start` - run application in default mode
- `npm start archive` - run application in archive mode (will process blocks from archive first)
- `npm run lint` - check codebase with Eslint
- `npm run build` - build project

License: Apache-2.0
