# Subspace-relayer-front-end

React app for the [Subspace Relayer](https://github.com/subspace/subspace/tree/main/relayer) feature.

It display a dashboard with the current status for archived parablocks from the configured source chain.

## Run

You need a Subspace client node producing blocks, for this, you need to follow instructions in the following links.

- Instructions to run the client and farmer: https://github.com/subspace/subspace/tree/main/crates/subspace-node

You also need to start the node.js relayer app, it subscribes to the blocks on the source chain (Kusama for now) and sends block data to the Subspace chain as an extrinsic.

- Instructions to run the relayer: https://github.com/subspace/subspace/tree/main/relayer

With these projects runing, you can start the react app, it will subscribe to new blocks using polkadot api and display the current total archived blocks, the total storage used, and the last archived block for every available parachain.

- `npm i` - install dependencies.

- `npm run start` - start the app.

## Scripts

- `npm run build`: Build the app in the /build directory with `react-scripts`.

- `npm run serve:build`: Serve the /build directory over localhost:5000 using `serve`. ( run `npm i -g serve`, must be locally installed).

- `npm run build:scss`: Script that compile `./src/assets/scss/*` files and write them as css in `./src/assets/css` directory with the new modified css.
  - Any custom style must be done in `./src/assets/scss` directory.

## .env

- Configure as needed, `REACT_APP_WS_PROVIDER` to your client node for provider connections with polkadot api.

```
REACT_APP_WS_PROVIDER=wss://test-rpc.subspace.network
```
