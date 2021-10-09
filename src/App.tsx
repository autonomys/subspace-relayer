import React, { useState } from "react";
import { WsProvider } from "@polkadot/rpc-provider";
import {
  HealthContextProvider,
  SystemContextProvider,
  RelayerContextProvider,
  ApiPromiseContextProvider,
} from "context";
import MainLayout from "layout/MainLayout";

const WS_PROVIDER = process.env.REACT_APP_WS_PROVIDER;

const App = () => {
  if (!WS_PROVIDER) {
    console.error("WS_PROVIDER not found from env, connecting to a local node");
  }

  const [provider] = useState<WsProvider>(
    new WsProvider(WS_PROVIDER || "ws://localhost:9944")
  );

  return (
    <SystemContextProvider provider={provider}>
      <HealthContextProvider provider={provider}>
        <ApiPromiseContextProvider provider={provider}>
          <RelayerContextProvider provider={provider}>
            <MainLayout />
          </RelayerContextProvider>
        </ApiPromiseContextProvider>
      </HealthContextProvider>
    </SystemContextProvider>
  );
};

export default App;
