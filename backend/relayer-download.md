# Configure relayer to download blocks from genesis.

- Get the latest relayer version and build it.

```
git clone https://github.com/subspace/subspace-relayer.git && cd subspace-relayer/backend
```

- Build to generate the dist folder

```
    npm i
    npm run build
```

# Runing

Run the block download tool with the following command, set the env variables for each chain you want to download.

For example:

```
SOURCE_CHAIN_RPC="https://kusama-rpc.polkadot.io" REPORT_PROGRESS_INTERVAL=1 TARGET_DIR="/home/USER/kusama-data/kusama-08-nov-2021" node dist/tools/download-substrate-blocks.js
```

Getting a similar output:

```
Retrieving last finalized block...
Last finalized block is 10013216
Downloading blocks into /home/USER/kusama-data/kusama-08-nov-2021
Continuing downloading from block 11
Downloaded block 11/10013216
Downloaded block 12/10013216 (0.54 blocks/s)
Downloaded block 13/10013216 (0.31 blocks/s)
Downloaded block 14/10013216 (0.54 blocks/s)
Downloaded block 15/10013216 (0.98 blocks/s)
Downloaded block 16/10013216 (0.70 blocks/s)
Downloaded block 17/10013216 (0.81 blocks/s)
Downloaded block 18/10013216 (0.35 blocks/s)
Downloaded block 19/10013216 (0.60 blocks/s)
```

*You can run this task in paralell for several chains.*
