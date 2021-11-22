import React, { useEffect, useRef, useState } from "react";
import { logger } from "@polkadot/util";
import { combineLatest, interval, MonoTypeOperatorFunction } from "rxjs";
import { distinctUntilChanged, filter, switchMap, take } from "rxjs/operators";
import { RpcCore } from "@polkadot/rpc-core";
import { RpcInterface } from "@polkadot/rpc-core/types";
import { Codec } from "@polkadot/types/types";
import { Text, TypeRegistry } from "@polkadot/types";
import {
  BlockHash,
  ChainProperties,
  Header,
  Health,
} from "@polkadot/types/interfaces";
import {
  SystemContextProviderProps,
  SystemContextType,
} from "context/interfaces";

import { providerConnected } from "./utils";
import { useProvider } from "context";

function distinctCodecChanged<T extends Codec>(): MonoTypeOperatorFunction<T> {
  return distinctUntilChanged<T>((x, y) => x.eq(y));
}

const l = logger("system-context");

export const SystemContext: React.Context<SystemContextType> =
  React.createContext({} as SystemContextType);

export function SystemContextProvider(
  props: SystemContextProviderProps
): React.ReactElement {
  const { children = null } = props;
  const provider = useProvider();

  const [chain, setChain] = useState<Text>();
  const [genesisHash, setGenesisHash] = useState<BlockHash>();
  const [header, setHeader] = useState<Header>();
  const [health, setHealth] = useState<Health>();
  const [name, setName] = useState<Text>();
  const [properties, setProperties] = useState<ChainProperties>();
  const [version, setVersion] = useState<Text>();
  const registryRef = useRef(new TypeRegistry());
  const [rpc, setRpc] = useState<RpcCore & RpcInterface>();

  useEffect(() => {
    setChain(undefined);
    setGenesisHash(undefined);
    setHeader(undefined);
    setHealth(undefined);
    setName(undefined);
    setProperties(undefined);
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
        switchMap(() =>
          combineLatest([
            rpc.system.chain(),
            rpc.chain.getBlockHash(),
            rpc.system.name(),
            rpc.system.properties(),
            rpc.system.version(),
          ])
        ),
        take(1)
      )
      .subscribe(([_chain, _genesisHash, _name, _properties, _version]) => {
        l.log(
          `Rpc connected to chain "${_chain}" name: "${_name}" with properties ${JSON.stringify(
            _properties
          )}`
        );

        setChain(_chain);
        setGenesisHash(_genesisHash);
        setName(_name);
        setProperties(_properties);
        setVersion(_version);
      });

    return (): void => sub.unsubscribe();
  }, [provider, rpc]);

  useEffect(() => {
    if (!provider || !rpc) {
      return;
    }

    const sub = providerConnected(provider)
      .pipe(
        filter((connected) => !!connected),
        switchMap(() =>
          combineLatest([
            interval(6000).pipe(
              switchMap(() => rpc.chain.getHeader()),
              distinctCodecChanged()
            ),
            interval(6000).pipe(
              switchMap(() => rpc.system.health()),
              distinctCodecChanged()
            ),
          ])
        )
      )
      .subscribe(([_header, _health]) => {
        setHeader(_header);
        setHealth(_health);
      });

    return (): void => sub.unsubscribe();
  }, [provider, rpc]);

  return (
    <SystemContext.Provider
      value={{
        chain,
        genesisHash,
        header,
        health,
        isSystemReady: !!(
          chain &&
          genesisHash &&
          header &&
          health &&
          name &&
          properties &&
          version
        ),
        name,
        properties,
        version,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}
