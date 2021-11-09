# Relayer

Node.js app which subscribes to the blocks on the source chain and sends block data to the Subspace chain as an extrinsic.
Transactions are signed and sent by the Subspace chain account, which is derived from the seed.

Path to JSON configuration file can be specified at `.env`:
```
CHAIN_CONFIG_PATH=config.json
```

`CHAIN_CONFIG_PATH` needs to point to JSON file with the following structure:
<details>

```json
{
    "primaryChain": {
        "downloadedArchivePath": "/path/to/kusama-archive-2021-oct-23",
        "httpUrl": "https://kusama-rpc.polkadot.io",
        "wsUrl": "wss://kusama-rpc.polkadot.io",
        "accountSeed": "//Alice//0",
        "feedId": 0
    },
    "parachains": [
        {
            "downloadedArchivePath": "/path/to/statemine-archive-2021-oct-23",
            "httpUrl": "https://kusama-statemine-rpc.paritytech.net",
            "paraId": 1000,
            "accountSeed": "//Alice//1000",
            "feedId": 1
        },
        {
            "httpUrl": "https://karura.api.onfinality.io/public",
            "paraId": 2000,
            "accountSeed": "//Alice//2000",
            "feedId": 2
        },
        {
            "httpUrl": "https://bifrost-parachain.api.onfinality.io/public",
            "paraId": 2001,
            "accountSeed": "//Alice//2001",
            "feedId": 3
        },
        {
            "httpUrl": "https://khala.api.onfinality.io/public",
            "paraId": 2004,
            "accountSeed": "//Alice//2004",
            "feedId": 4
        },
        {
            "httpUrl": "https://shiden.api.onfinality.io/public",
            "paraId": 2007,
            "accountSeed": "//Alice//2007",
            "feedId": 5
        },
        {
            "httpUrl": "https://moonriver.api.onfinality.io/public",
            "paraId": 2023,
            "accountSeed": "//Alice//2023",
            "feedId": 6
        },
        {
            "httpUrl": "https://calamari.api.onfinality.io/public",
            "paraId": 2084,
            "accountSeed": "//Alice//2084",
            "feedId": 7
        },
        {
            "httpUrl": "https://spiritnet.api.onfinality.io/public",
            "paraId": 2086,
            "accountSeed": "//Alice//2086",
            "feedId": 8
        },
        {
            "httpUrl": "https://basilisk.api.onfinality.io/public",
            "paraId": 2090,
            "accountSeed": "//Alice//2090",
            "feedId": 9
        },
        {
            "httpUrl": "https://altair.api.onfinality.io/public",
            "paraId": 2088,
            "accountSeed": "//Alice//2088",
            "feedId": 10
        },
        {
            "httpUrl": "https://parallel-heiko.api.onfinality.io/public",
            "paraId": 2085,
            "accountSeed": "//Alice//2085",
            "feedId": 11
        },
        {
            "httpUrl": "https://kintsugi.api.onfinality.io/public",
            "paraId": 2092,
            "accountSeed": "//Alice//2092",
            "feedId": 12
        }
    ]
}
```

Where:
* `targetChainUrl` - WebSocket JSON-RPC endpoint URL of the target (Subspace) chain where transactions with blocks will be sent
* `downloadedArchivePath` - optional path to downloaded archive of blocks for a particular chain as RocksDB database (can be created with `tools/download-substrate-blocks` script)
* `httpUrl` - HTTP JSON-RPC endpoint URL of a Substrate-based chain
* `wsUrl` - WebSocket JSON-RPC endpoint URL of the main Substrate-based chain (in most cases relay chain like Kusama or Polkadot, but can be used with any other chain too)
* `paraId` - ID of a parachain or parathread under above relay chain
* `accountSeed` - seed for the account that will be used on target chain for submitting transactions with blocks for particular chain (all such accounts can be funded with `tools/fund-accounts` script)
* `feedId` - ID of the feed already created on Subspace chain into which archived blocks will go

</details>

## Scripts
- `npm start` - run application
- `npm run lint` - check codebase with Eslint
- `npm run build` - build project

License: Apache-2.0
