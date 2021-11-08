# Configure relayer "live mode"

- Get the latest relayer version and build it.

```
git clone https://github.com/subspace/subspace-relayer.git && cd subspace-relayer/backend
```

We have to made some manual configuration. As some of these are not static.

- In the backend directory. Check that .env point to the local subspace-node-public container WS.

```
TARGET_CHAIN_URL="ws://subspace-node-public:9944"
ACCOUNT_SEED="//Alice"
```

- In the backend directory (./src/config/archives.json). Check if this file its empty.

```
[]
```

- With .env and archives.json edited, generate the dist folder that will run in the docker container with the current configuration.

```
    npm install
    npm run build
```

# Building.

- Generate the local image with the current configuration.

```
docker build . -t relayer-backend
```

# Runing

- Run the image
  - and to run the relayer backend in the docker subspace network where the nodes are running.

```
docker run -it --net subspace --name relayer-backend relayer-backend:latest

```
