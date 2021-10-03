import React, { useContext, useEffect, useState } from "react";
import { ProviderInterface } from "@polkadot/rpc-provider/types";
import { Header, Health } from "@polkadot/types/interfaces";
import { SystemContext } from "context";
import {
  HealthContextProviderProps,
  HealthContextType,
} from "context/interfaces";

const SYNCING_THRESHOLD = 2000;
let wasSyncing = true;

function getNodeStatus(
  provider?: ProviderInterface,
  header?: Header,
  health?: Health
): Omit<HealthContextType, "isSyncing"> {
  let best = 0;
  let isNodeConnected = false;
  let hasPeers = false;

  if (provider && provider.isConnected && health && header) {
    isNodeConnected = true;
    best = header.number.toNumber();

    if (health.peers.gten(1)) {
      hasPeers = true;
    }
  }

  return {
    best,
    hasPeers,
    isNodeConnected,
  };
}

export const HealthContext: React.Context<HealthContextType> =
  React.createContext({} as HealthContextType);

export function HealthContextProvider(
  props: HealthContextProviderProps
): React.ReactElement {
  const { children = null, provider } = props;
  const { header, health } = useContext(SystemContext);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    wasSyncing = true;
    setIsSyncing(true);
  }, [provider]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (!health) return;

    if (!wasSyncing && health.isSyncing.eq(true)) {
      wasSyncing = true;
      timer = setTimeout(() => {
        setIsSyncing(true);
      }, SYNCING_THRESHOLD);
    } else if (wasSyncing && health.isSyncing.eq(false)) {
      wasSyncing = false;
      setIsSyncing(false);
      timer && clearTimeout(timer);
    }
    return (): void => {
      timer && clearTimeout(timer);
    };
  }, [health, setIsSyncing]);

  const status = {
    ...getNodeStatus(provider, header, health),
    isSyncing,
  };
  return (
    <HealthContext.Provider value={status}>{children}</HealthContext.Provider>
  );
}
