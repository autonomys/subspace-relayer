import { WsProvider } from "@polkadot/rpc-provider";
import { useState } from "react";
import {
  HealthContextProvider,
  ProviderContextProvider,
  SystemContextProvider,
} from "context";
import MainLayout from "layout/MainLayout";

const WS_PROVIDER = process.env.REACT_APP_WS_PROVIDER || "ws://localhost:9944";

const App = () => {
  console.info("Connecting to: ", WS_PROVIDER);

  const [provider] = useState<WsProvider>(new WsProvider(WS_PROVIDER));

  return (
    <ProviderContextProvider provider={provider}>
      <SystemContextProvider>
        <HealthContextProvider>
          <MainLayout />
        </HealthContextProvider>
      </SystemContextProvider>
    </ProviderContextProvider>
  );
};

export default App;
