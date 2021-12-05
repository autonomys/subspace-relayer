import React, { useContext, useEffect, useState } from "react";
import { ApiPromise } from "@polkadot/api";
import { Header } from "@polkadot/types/interfaces";
import { from } from "rxjs";
import { allChains } from "config/AvailableParachain";
import { Totals, ParachainFeed, FeedTotals } from "config/interfaces/Parachain";
import {
  RelayerContextProviderProps,
  RelayerContextType,
  SystemContext,
  ApiPromiseContext,
} from "context";

function allChainFeeds(): number[] {
  return allChains.map((chain) => chain.feedId);
}

function extractFeed(
  api: ApiPromise,
  args: Array<any>,
  subspaceHash: string
): ParachainFeed {
  const id: number = api.registry.createType("u64", args[0]).toNumber();
  const metadata = api.registry.createType("Bytes", args[2]).toHuman();
  const { hash, number } = JSON.parse(metadata?.toString() || "{}");
  return {
    feedId: id,
    hash: hash || "",
    number: number || "",
    size: 0,
    count: 0,
    subspaceHash,
  };
}

async function getFeedTotals(api: ApiPromise): Promise<FeedTotals[]> {
  const feedsTotals: FeedTotals[] = [];
  const totals = await api.query.feeds.totals.multi(allChainFeeds());
  for (let i = 0; i < totals.length; i++) {
    const feedTotal: Totals = api.registry.createType("Totals", totals[i]);
    feedsTotals.push({
      feedId: i,
      size: feedTotal.size_.toNumber(),
      count: feedTotal.count.toNumber(),
    });
  }
  return feedsTotals;
}

async function loadFeeds(api: ApiPromise): Promise<ParachainFeed[]> {
  const feeds: ParachainFeed[] = [];

  const [feedsMetadata, totals] = await Promise.all([
    api.query.feeds.metadata.multi(allChainFeeds()),
    getFeedTotals(api),
  ]);
  if (feedsMetadata.length === 0 && totals.length === 0) {
    for (let i = 0; i < feedsMetadata.length; i++) {
      const feedMetadata = feedsMetadata[i].toHuman()?.toString();
      feeds.push({
        feedId: i,
        ...JSON.parse(feedMetadata || "{}"),
        size: totals[i].size,
        count: totals[i].count,
      });
    }
  }
  return feeds;
}

async function getFeeds(
  api: ApiPromise,
  { hash }: Header,
  oldFeeds: ParachainFeed[]
): Promise<ParachainFeed[]> {
  const [{ block }, totals] = await Promise.all([
    api.rpc.chain.getBlock(hash),
    getFeedTotals(api),
  ]);
  const subspaceHash = block.hash.toString();
  let newFeeds: ParachainFeed[] = [...oldFeeds];

  block.extrinsics.forEach(({ method: { method, section, args } }) => {
    let newFeed: ParachainFeed | undefined;
    if (section === "utility" && method === "batchAll") {
      // This works but could be improved using correct types
      // It assumes that a batchAll contains a Vec of put calls
      const batchCalls: any = args[0];
      for (const { args } of batchCalls) {
        // Using 3 args feedId, data, metadata.
        if (args?.length === 3) {
          newFeed = extractFeed(api, args, subspaceHash);
          break;
        }
      }
    } else if (section === "feeds" && method === "put" && args.length === 3) {
      newFeed = extractFeed(api, args, subspaceHash);
    }

    if (newFeed) {
      const { feedId } = newFeed;
      newFeeds[feedId] = {
        ...newFeed,
        ...totals[feedId],
      };
    }
  });
  return newFeeds;
}

export const RelayerContext: React.Context<RelayerContextType> =
  React.createContext({} as RelayerContextType);

export function RelayerContextProvider(
  props: RelayerContextProviderProps
): React.ReactElement {
  const { children = null } = props;
  const { header } = useContext(SystemContext);
  const { api, isApiReady } = useContext(ApiPromiseContext);
  const [parachainFeeds, setParachainFeeds] = useState<ParachainFeed[]>([]);
  const [firstLoad, setFirstLoad] = useState<boolean>(true);

  useEffect(() => {
    if (!isApiReady || !api || !firstLoad) return;
    const subscription = from(loadFeeds(api)).subscribe((initFeeds) => {
      setFirstLoad(false);
      setParachainFeeds(initFeeds);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [isApiReady, api, firstLoad, header]);

  useEffect(() => {
    if (!isApiReady || !api || firstLoad) return;

    if (header) {
      const subscription = from(
        getFeeds(api, header, parachainFeeds)
      ).subscribe((newFeeds) => {
        setParachainFeeds(newFeeds);
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isApiReady, api, firstLoad, header]);

  return (
    <RelayerContext.Provider value={{ parachainFeeds }}>
      {children}
    </RelayerContext.Provider>
  );
}
