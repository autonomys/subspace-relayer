import React from "react";
import { ApiPromiseContextProvider } from "context/SubspaceContext";
import MainLayout from "components/MainLayout";
import { WsProvider } from "@polkadot/rpc-provider";

const WS_PROVIDER = process.env.REACT_APP_WS_PROVIDER;

const App = () => {
  if (!WS_PROVIDER) {
    console.error("WS_PROVIDER not found from env");
    return null;
  }

  const provider = new WsProvider(WS_PROVIDER);

  return (
    <ApiPromiseContextProvider provider={provider}>
      <MainLayout />
    </ApiPromiseContextProvider>
  );
};

export default App;
