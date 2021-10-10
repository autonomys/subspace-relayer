import React, { useEffect, useState } from "react";
import { logger } from "@polkadot/util";
import { ApiPromise } from "@polkadot/api";
import { TypeRegistry } from "@polkadot/types";
import {
  ApiPromiseContextProviderProps,
  ApiPromiseContextType,
} from "context/interfaces";
import { useProvider } from "./ProviderContext";
import customTypes from "context/utils/types.json";

const l = logger("api-context");
const registry = new TypeRegistry();

export const ApiPromiseContext: React.Context<ApiPromiseContextType> =
  React.createContext({} as ApiPromiseContextType);

export function ApiPromiseContextProvider(
  props: ApiPromiseContextProviderProps
): React.ReactElement {
  const { children = null } = props;
  const provider = useProvider();
  const [apiPromise] = useState<ApiPromise>(
    new ApiPromise({ provider, types: customTypes })
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    apiPromise.isReady
      .then(() => {
        registry.register(customTypes);
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
