import React, { useEffect, useRef, useState } from "react";
import { logger } from "@polkadot/util";
import { combineLatest } from "rxjs";
import { filter, switchMap, take } from "rxjs/operators";
import { RpcCore } from "@polkadot/rpc-core";
import { RpcInterface } from "@polkadot/rpc-core/types";
import { Text, TypeRegistry } from "@polkadot/types";
import { SystemContextProviderProps, SystemContextType } from "context/interfaces";
import { providerConnected } from "./utils";
import { useProvider } from "context";

const l = logger("system-context");

export const SystemContext: React.Context<SystemContextType> =
  React.createContext({} as SystemContextType);

export function SystemContextProvider(
  props: SystemContextProviderProps
): React.ReactElement {
  const { children = null } = props;
  const provider = useProvider();

  const [version, setVersion] = useState<Text>();
  const registryRef = useRef(new TypeRegistry());
  const [rpc, setRpc] = useState<RpcCore & RpcInterface>();

  useEffect(() => {
    setVersion(undefined);

    if (!provider) {
      return;
    }
    setRpc(
      new RpcCore("instance", registryRef.current, provider) as RpcCore &
        RpcInterface
    );
  }, [provider]);

  useEffect(() => {
    if (!provider || !rpc) {
      return;
    }

    const sub = providerConnected(provider)
      .pipe(
        filter((connected) => !!connected),
        switchMap(() => combineLatest([rpc.system.chain(), rpc.system.version()])),
        take(1)
      )
      .subscribe(([_chain, _version]) => {
        l.log(`Rpc connected to chain "${_chain}" with version "${_version}"`);
        setVersion(_version);
      });

    return (): void => sub.unsubscribe();
  }, [provider, rpc]);

  return (
    <SystemContext.Provider
      value={{
        version,
        isSystemReady: !!version,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}
