import React, { useEffect, useState } from "react";
import { logger } from "@polkadot/util";
import { ApiPromise } from "@polkadot/api";
import {
  ApiPromiseContextProviderProps,
  ApiPromiseContextType,
} from "context/interfaces";
import { useProvider } from "./ProviderContext";

const l = logger("api-context");

export const ApiPromiseContext: React.Context<ApiPromiseContextType> =
  React.createContext({} as ApiPromiseContextType);

export function ApiPromiseContextProvider(
  props: ApiPromiseContextProviderProps
): React.ReactElement {
  const { children = null } = props;
  const provider = useProvider();
  const [apiPromise] = useState<ApiPromise>(
    new ApiPromise({ provider })
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    apiPromise.isReady
      .then(() => {
        l.log(`Api ready OK.`);
        setIsReady(true);
      })
      .catch((e) => console.error(e));
  }, [apiPromise.isReady]);

  return (
    <ApiPromiseContext.Provider
      value={{ api: apiPromise, isApiReady: isReady }}
    >
      {children}
    </ApiPromiseContext.Provider>
  );
}
