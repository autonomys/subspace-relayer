import React, { useEffect, useState } from "react";
import { ApiPromise } from "@polkadot/api";
import { TypeRegistry } from "@polkadot/types";
import { logger } from "@polkadot/util";
import { ApiPromiseContextProviderProps } from "./ContextTypes";
import types from "./types.json";

export interface ApiPromiseContextType {
  api: ApiPromise;
  isApiReady: boolean;
}

const l = logger("api-context");
const registry = new TypeRegistry();

export const ApiPromiseContext: React.Context<ApiPromiseContextType> =
  React.createContext({} as ApiPromiseContextType);

export function ApiPromiseContextProvider(
  props: ApiPromiseContextProviderProps
): React.ReactElement {
  const { children = null, provider } = props;
  const [apiPromise] = useState<ApiPromise>(
    new ApiPromise({ provider, types })
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    apiPromise.isReady
      .then((_) => {
        if (types) {
          registry.register(types);
        }

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
