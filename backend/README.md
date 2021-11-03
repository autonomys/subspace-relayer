# Relayer

Node.js app which subscribes to the blocks on the source chain and sends block data to the Subspace chain as an extrinsic. Transactions are signed and sent by the Subspace chain account, which is derived from the seed.

Seed as well as source chain and target chain URLs can be specified at `.env`:
```
TARGET_CHAIN_URL="ws://127.0.0.1:9944"
ACCOUNT_SEED="//Alice"
```
By default application will process blocks from the chains specified in `config/sourceChains.json`. In order to process blocks from archive it is required to specify chains in the `config/archives.json` including `path` to RocksDB as well as HTTP endpoint for RPC API, for example:
```
[
    {
        "url": "https://kusama.api.onfinality.io/public",
        "path": "/Users/apple/Documents/kusama-archive-2021-oct-23"
    },
    {
        "url": "https://altair.api.onfinality.io/public",
        "path": "/Users/apple/Documents/altair-archive-2021-oct-23"
    }
]
```

## Scripts
- `npm start` - run application in default mode
- `npm start archive` - run application in archive mode (will process blocks from archive first)
- `npm run lint` - check codebase with Eslint
- `npm run build` - build project

License: Apache-2.0
