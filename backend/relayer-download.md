# Configure relayer to download blocks from genesis.

- Get the latest relayer version and build it.

```
git clone https://github.com/subspace/subspace-relayer.git && cd subspace-relayer/backend
```

We have to made some manual configuration. As some of these are not static.

- In the backend directory. Check **.env** and set for example:

```
SOURCE_CHAIN_RPC=https://kusama-rpc.polkadot.io
REPORT_PROGRESS_INTERVAL=10
TARGET_DIR=/home/USER/kusama-data/kusama-08-nov-2021

```

- With **.env** and **archives.json** edited, generate the dist folder that will run in the docker container with the current configuration.

```
    npm i
    npm run build
```

# Runing

Run the block download tool with the following command:

```
node dist/tools/download-substrate-blocks.js
```
