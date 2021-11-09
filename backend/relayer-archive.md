# Configure relayer "local mode"

- Get the latest relayer version and build it.

```
git clone https://github.com/subspace/subspace-relayer.git && cd subspace-relayer/backend
```

We have to made some manual configuration. As some of these are not static.

- In the backend directory. Check that **.env** point to the local subspace-node-public container WS.

```
TARGET_CHAIN_URL="ws://subspace-node-public:9944"
ACCOUNT_SEED="//Alice"
```

- In the backend directory (./src/config/**archives.json**). Configure to add the chain data archives. For example:

```
[
  {
    "url": "https://kusama-rpc.polkadot.io",
    "path": "/home/relayer/relayer-backend/chain-data/Kusama-archives/kusama-archive-2021-oct-23"
  },
  {
      "url": "https://altair.api.onfinality.io/public",
      "path": "/home/relayer/relayer-backend/chain-data/Kusama-archives/altair-archive-2021-oct-23"
  }
]
```

- With **.env** and **archives.json** edited, generate the dist folder that will run in the docker container with the current configuration.

```
    npm i
    npm run build
```

# Building.

- Generate the local docker image with the current configuration.

```
docker build . -t relayer-backend
```

# Runing

- Run the image:

  - --volume | map a local directory to the docker container.
  - --net subspace | run the relayer backend in the docker subspace network where the container nodes are running.
  - replace LOCAL_CHAIN_DATA_DIR with the path to the chain data archives.
  - pass **archive** parameter to the ENTRYPOINT, to run the relayer in archive mode.

```
docker run -it --volume /mnt/LOCAL_CHAIN_DATA_DIR:/home/relayer/relayer-backend/chain-data --net subspace --name relayer-backend relayer-backend:latest archive
```
