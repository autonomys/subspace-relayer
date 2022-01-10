import React, { useState, ReactElement } from "react";
import { WsProvider } from "@polkadot/rpc-provider";
import { getApiUrl } from "config/RpcSettings";
import NavBar from "components/NavBar";
import ParachainTable from "components/ParachainTable";
import Footer from "components/Footer";
import {
  RelayerContextProvider,
  ApiPromiseContextProvider,
  ProviderContextProvider,
  SystemContextProvider,
} from "context";

const App: React.FC = (): ReactElement => {
  const [provider] = useState<WsProvider>(new WsProvider(getApiUrl()));

  return (
    <ProviderContextProvider provider={provider}>
      <SystemContextProvider>
        <ApiPromiseContextProvider>
          <RelayerContextProvider>
            <>
              <NavBar />
              <ParachainTable />
              <Footer />
            </>
          </RelayerContextProvider>
        </ApiPromiseContextProvider>
      </SystemContextProvider>
    </ProviderContextProvider>
  );
};

export default App;
