# Subspace-relayer-front-end

React app for the [Subspace Relayer](https://github.com/subspace/subspace/tree/main/relayer) feature.

It display a dashboard with the current status for archived parablocks from the configured source chain.

## Run

- `yarn install` - install dependencies.

- `yarn start` - start the app,

## Scripts

- `yarn build`: Build the app in the /build directory with `react-scripts`.

- `yarn build:scss`: Script that compile `./src/assets/scss/*` files and write them as css in `./src/assets/css` directory with the new modified css.
  - Any custom style must be done in `./src/assets/scss` directory.

## .env

- Configure as needed, `REACT_APP_WS_PROVIDER` to your client node for provider connections with polkadot api.

```
REACT_APP_WS_PROVIDER=ws://127.0.0.1:9944
```
