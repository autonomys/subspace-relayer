import React from "react";
import { WsProvider } from "@polkadot/rpc-provider";
import { ProviderContextProps, ProviderContextType } from "./interfaces";

const ProviderContext: React.Context<ProviderContextType> = React.createContext(
  {} as ProviderContextType
);

const ProviderContextProvider = (
  props: ProviderContextProps
): React.ReactElement => {
  const { children = null, provider } = props;

  return (
    <ProviderContext.Provider value={{ provider: provider }}>
      {children}
    </ProviderContext.Provider>
  );
};

const useProvider = (): WsProvider => {
  const { provider } = React.useContext(ProviderContext);
  return provider;
};

export { ProviderContextProvider, useProvider };
