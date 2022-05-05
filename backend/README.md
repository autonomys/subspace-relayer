# Relayer

Node.js app which subscribes to the blocks on the source chain and sends block data to the Subspace chain as an extrinsic.
Transactions are signed and sent by the corresponding account (per chain), which is derived from the main seed. 
For example: `//Alice//1` 
Where: 
* `//Alice` is the main seed (for development) 
* `1` is chain feed ID (specified in the config below).

Main seed and path to JSON configuration file can be specified at `.env`:
```
CHAIN_CONFIG_PATH=config.json
FUNDS_ACCOUNT_SEED="//Alice"
```

`CHAIN_CONFIG_PATH` needs to point to JSON file with the following structure:
<details>

```json
{
    "targetChainUrl": "ws://127.0.0.1:9944",
    "primaryChain": {
        "downloadedArchivePath": "/path/to/kusama-archive-2021-oct-23",
        "wsUrls": [
            "wss://kusama-rpc.polkadot.io",
            "wss://kusama.api.onfinality.io/public-ws",
            "wss://pub.elara.patract.io/kusama",
            "wss://kusama.geometry.io/websockets"
        ],
        "feedId": 0,
        "bestGrandpaFinalizedBlockNumber": 12518416
    },
    "parachains": [
        {
            "downloadedArchivePath": "/path/to/statemine-archive-2021-oct-23",
            "wsUrls": [
                "wss://statemine-rpc.polkadot.io",
                "wss://statemine.api.onfinality.io/public-ws"
            ],
            "paraId": 1000,
            "feedId": 1
        },
        {
            "wsUrls": [
                "wss://karura-rpc-0.aca-api.network",
                "wss://karura-rpc-1.aca-api.network",
                "wss://karura-rpc-2.aca-api.network/ws",
                "wss://karura-rpc-3.aca-api.network/ws",
                "wss://karura.polkawallet.io",
                "wss://karura.api.onfinality.io/public-ws",
                "wss://pub.elara.patract.io/karura"
            ],
            "paraId": 2000,
            "feedId": 2
        },
        {
            "wsUrls": [
                "wss://bifrost-rpc.liebi.com/ws",
                "wss://bifrost-parachain.api.onfinality.io/public-ws",
                "wss://pub.elara.patract.io/bifrost"
            ],
            "paraId": 2001,
            "feedId": 3
        },
        {
            "wsUrls": [
                "wss://khala-api.phala.network/ws",
                "wss://khala.api.onfinality.io/public-ws"
            ],
            "paraId": 2004,
            "feedId": 4
        },
        {
            "wsUrls": [
                "wss://rpc.shiden.astar.network",
                "wss://rpc.pinknode.io/shiden/explorer"
            ],
            "paraId": 2007,
            "feedId": 5
        },
        {
            "wsUrls": [
                "wss://wss.moonriver.moonbeam.network",
                "wss://moonriver.api.onfinality.io/public-ws",
                "wss://rpc.pinknode.io/moonriver/explorer",
                "wss://pub.elara.patract.io/moonriver"
            ],
            "paraId": 2023,
            "feedId": 6
        }
    ]
}
```

Where:
* `targetChainUrl` - WebSocket JSON-RPC endpoint URL of the target (Subspace) chain where transactions with blocks will be sent
* `downloadedArchivePath` - optional path to downloaded archive of blocks for a particular chain as RocksDB database (can be created with `tools/download-substrate-blocks` script)
* `wsUrls` - WebSocket JSON-RPC endpoint URLs of the main Substrate-based chain (in most cases relay chain like Kusama or Polkadot, but can be used with any other chain too)
* `paraId` - ID of a parachain or parathread under above relay chain
* `feedId` - ID of the feed already created on Subspace chain into which archived blocks will go (`tools/create-feeds` script can be used to create feeds for accounts in the config file)
* `bestGrandpaFinalizedBlockNumber` - relay chain block number from which [pallet-grandpa-finality-verifier](https://github.com/subspace/subspace/tree/main/crates/pallet-grandpa-finality-verifier) starts GRANDPA verification. It has to be a block when GRANDPA authorities changed 

</details>

## Account funding
Currently balance transfers are disabled. Every chain accounts has to be funded using SUDO before starting the relayer. It is possible to check all account balances using script below

## Scripts
- `npm start` - run application
- `npm run setup` - create feeds based on the `config.json`
- `npm run balances` - list all chain accounts and their balances
- `npm run lint` - check codebase with Eslint
- `npm run build` - build project

## Creating chain history archive

In order to create chain archive, it is required to download source chain blocks from locally running archive node. Once you have archive node running, you need to set values for `SOURCE_CHAIN_RPC` and
`TARGET_DIR` env variables and run `tools/download-substrate-blocks` script, for example:
```
SOURCE_CHAIN_RPC="ws://localhost:9944" TARGET_DIR="path/to/archive" node dist/tools/download-substrate-blocks.js
```

This will download chain history from the source chain to archive (RocksDB). Path to downloaded archive can then be added to `downloadedArchivePath` at `config.json`.

## Docker

Instructions to build and run with docker:

<details>

### Build

If you decide to build image yourself:
```
docker build -t ghcr.io/subspace/relayer:latest .
```

### List account balances

Replace `DIR_WITH_CONFIG` with directory where `config.json` is located.

```bash
docker run --rm -it \
    -e CHAIN_CONFIG_PATH="/config.json" \
    -e FUNDS_ACCOUNT_SEED="//Alice" \
    --volume /DIR_WITH_CONFIG/config.json:/config.json:ro \
    --network host \
    --entrypoint "node" \
    ghcr.io/subspace/relayer /dist/tools/list-account-balances.js
```

### Run feeds creation
Creates feeds for all chains specified in `config.json`.

Replace `DIR_WITH_CONFIG` with directory where `config.json` is located.

```bash
docker run --rm -it \
    -e CHAIN_CONFIG_PATH="/config/config.json" \
    -e FUNDS_ACCOUNT_SEED="//Alice" \
    --volume /DIR_WITH_CONFIG/config.json:/config.json:ro \
    ghcr.io/subspace/relayer \
    create-feeds
```

### Run single feed creation
Creates feed for particular chain, used when adding a new chain to existing relayer.

Replace:
* `DIR_WITH_CONFIG` with directory where `config.json` is located
* `PARA_ID` with para id specified in the `config.json`

```bash
docker run --rm -it \
    -e CHAIN_CONFIG_PATH="/config/config.json" \
    -e FUNDS_ACCOUNT_SEED="//Alice" \
    --volume /DIR_WITH_CONFIG/config.json:/config.json:ro \
    --entrypoint "node" \
    ghcr.io/subspace/relayer /dist/tools/create-single-feed.js PARA_ID
```

### Run relayer

Replace `DIR_WITH_CONFIG` with directory where `config.json` is located (we mount directory such that config can be
re-read on restart by relayer if updated).

```bash
docker run --rm -it --init \
    -e CHAIN_CONFIG_PATH="/config/config.json" \
    --volume /DIR_WITH_CONFIG:/config:ro \
    --network host \
    --name subspace-relayer \
    ghcr.io/subspace/relayer
```

</details>
