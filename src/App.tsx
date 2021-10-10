import { WsProvider } from "@polkadot/rpc-provider";
import { useState } from "react";
import {
  ApiPromiseContextProvider,
  HealthContextProvider,
  ProviderContextProvider,
  SystemContextProvider,
} from "context";
import MainLayout from "layout/MainLayout";

const WS_PROVIDER = process.env.REACT_APP_WS_PROVIDER;

const App = () => {
  console.info("Connecting to: ", WS_PROVIDER);

  const [provider] = useState<WsProvider>(
    new WsProvider(WS_PROVIDER || "ws://localhost:9944")
  );

  return (
    <ProviderContextProvider provider={provider}>
      <SystemContextProvider>
        <HealthContextProvider>
          <ApiPromiseContextProvider>
            <MainLayout />
          </ApiPromiseContextProvider>
        </HealthContextProvider>
      </SystemContextProvider>
    </ProviderContextProvider>
  );
};

export default App;
