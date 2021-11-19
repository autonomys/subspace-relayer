import { WsProvider } from "@polkadot/rpc-provider";
import { useState } from "react";
import { getApiUrl } from "config/RpcSettings";
import {
  HealthContextProvider,
  ProviderContextProvider,
  SystemContextProvider,
} from "context";
import MainLayout from "layout/MainLayout";

const App = () => {
  const [provider] = useState<WsProvider>(new WsProvider(getApiUrl()));

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
