import React, { useContext, useEffect, useState } from "react";
import { from } from "rxjs";
import {
  RelayerContextProviderProps,
  RelayerContextType,
} from "context/interfaces";
import { Totals } from "config/interfaces/Parachain";

import { parachains } from "config/AvailableParachain";
import { ApiPromiseContext, SystemContext } from "context";
import { ApiPromise } from "@polkadot/api";
import { useProvider } from "./ProviderContext";

async function getFeedTotals(api: ApiPromise, n?: number): Promise<Totals[]> {
  const feedsTotals: Array<Totals> = Array<Totals>();
  for (const { feedId } of parachains) {
    const totals = await api.query.feeds.totals(feedId);
    const _totals: Totals = api.registry.createType("Totals", totals);
    feedsTotals.push(_totals);
  }
  return feedsTotals;
}

export const RelayerContext: React.Context<RelayerContextType> =
  React.createContext({} as RelayerContextType);

export function RelayerContextProvider(
  props: RelayerContextProviderProps
): React.ReactElement {
  const { children = null } = props;
  const provider = useProvider();
  const { api, isApiReady } = useContext(ApiPromiseContext);
  const { header } = useContext(SystemContext);
  const [feedsTotals, setFeedsTotals] = useState<Totals[]>(
    Array<Totals>(parachains.length)
  );

  useEffect(() => {
    if (!provider || !isApiReady || !api) {
      return;
    }
    const subscription = from(
      getFeedTotals(api, header?.number.toNumber())
    ).subscribe((totals) => {
      setFeedsTotals(totals);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [provider, api, isApiReady, header]);

  return (
    <RelayerContext.Provider value={{ feedsTotals }}>
      {children}
    </RelayerContext.Provider>
  );
}
