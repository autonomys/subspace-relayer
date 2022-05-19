import React, { useContext, useEffect, useState } from "react";
import { ApiPromise } from "@polkadot/api";
import { from } from "rxjs";
import { allChains } from "config/AvailableParachain";
import { Totals, ParachainFeed, FeedTotals } from "config/interfaces/Parachain";
import { RelayerContextProviderProps, RelayerContextType, ApiPromiseContext } from "context";
import { Hash, BlockNumber, Header } from "@polkadot/types/interfaces";
import type { ITuple } from '@polkadot/types-codec/types';
import { EventRecord } from "@polkadot/types/interfaces/system";
import { Vec } from "@polkadot/types";
import type { Codec } from '@polkadot/types-codec/types';
import { U64 } from "@polkadot/types";
import { VoidFn } from "@polkadot/api/types";

// TODO: implement tests
const decodeMetadata = (api: ApiPromise, rawMetadata: Codec) => {
  const metadataBytes = rawMetadata.toU8a(true);
  const metadataType = api.createType("(Hash, BlockNumber)", metadataBytes);
  return metadataType as ITuple<[Hash, BlockNumber]>;
}

const feedIds: number[] = allChains.map((chain) => chain.feedId);

async function getFeedTotals(api: ApiPromise): Promise<FeedTotals[]> {
  const feedsTotals: FeedTotals[] = [];
  const totals = await api.query.feeds.totals.multi(feedIds);
  for (let i = 0; i < feedIds.length; i++) {
    const feedId = feedIds[i];
    const feedTotal: Totals = api.registry.createType("PalletFeedsTotalObjectsAndSize", totals[i]);
    if (!feedTotal.isEmpty)
      feedsTotals.push({
        feedId,
        size: feedTotal.size_.toNumber(),
        count: feedTotal.count.toNumber(),
      });
  }
  return feedsTotals;
}

async function getInitFeeds(api: ApiPromise): Promise<Map<number, ParachainFeed>> {
  const feeds = new Map();
  const [
    feedsMetadata,
    totals
  ] = await Promise.all([
    api.query.feeds.metadata.multi(feedIds),
    getFeedTotals(api)
  ]);

  for (let i = 0; i < feedIds.length; i++) {
    const feedId = feedIds[i];
    const rawMetadata = feedsMetadata[i];
    const total = totals.find((t) => t.feedId === feedId);

    if (!rawMetadata.isEmpty && total) {
      const [hash, number] = decodeMetadata(api, rawMetadata);

      feeds.set(feedId, {
        number: number.toNumber(),
        hash: hash.toString(),
        subspaceHash: '', // empty by default, updated when new header is received
        size: total.size,
        count: total.count,
      });
    }
  }

  return feeds;
}

// TODO: implement tests
async function updateFeedsFromEvents(api: ApiPromise, { hash }: Header, feeds: Map<number, ParachainFeed>): Promise<Map<number, ParachainFeed>> {
  const feedsClone = new Map(feeds);
  const subspaceHash = hash.toString();
  const blockApi = await api.at(hash);
  const eventRecords = await blockApi.query.system.events() as Vec<EventRecord>;

  eventRecords
    .filter(({ event }) => event.method === 'ObjectSubmitted')
    .forEach(({ event }) => {
      // assuming event has following structure:
      //   Event::ObjectSubmitted {
      //     feed_id,
      //     who: owner,
      //     metadata,
      //     object_size,
      // });
      const [feedId, , metadata, size] = event.data;
      const feedIdAsNumber = (feedId as U64).toNumber();
      const [hash, number] = decodeMetadata(api, metadata);
      const existing = feedsClone.get(feedIdAsNumber);

      if (existing) {
        feedsClone.set(feedIdAsNumber, {
          feedId: feedIdAsNumber,
          size: existing.size + (size as U64).toNumber(),
          hash: hash.toString(),
          number: number.toNumber(),
          subspaceHash,
          count: existing.count + 1,
        })
      }
    });

  return feedsClone;
}

export const RelayerContext: React.Context<RelayerContextType> = React.createContext({} as RelayerContextType);

export function RelayerContextProvider({ children }: RelayerContextProviderProps): React.ReactElement {
  const { api, isApiReady } = useContext(ApiPromiseContext);
  const [header, setHeader] = useState<Header>();
  const [feeds, setFeeds] = useState<Map<number, ParachainFeed>>(new Map());
  const [firstLoad, setFirstLoad] = useState<boolean>(true);

  // Get feeds for the first load.
  useEffect(() => {
    if (!isApiReady || !api || !firstLoad) return;
    const sub = from(getInitFeeds(api)).subscribe((initFeeds) => {
      setFeeds(initFeeds);
      setFirstLoad(false);
    });
    return (): void => sub.unsubscribe();
  }, [isApiReady, api, firstLoad]);

  // TODO: ideally no need to store header in the state, only process and update feeds
  // Get new header using a subscription, to avoid missing blocks.
  useEffect(() => {
    if (!isApiReady || !api || firstLoad) return;
    let unsubscribe: VoidFn;

    api.rpc.chain.subscribeNewHeads((header) => setHeader(header))
      .then(unsub => { unsubscribe = unsub; });

    return () => unsubscribe();
  }, [isApiReady, api, firstLoad]);

  // Update feeds based on the new block events.
  useEffect(() => {
    if (!isApiReady || !api || !header) return;
    if (header && feeds.size > 0) {
      const sub = from(updateFeedsFromEvents(api, header, feeds)).subscribe((newFeeds) => {
        setFeeds(newFeeds);
      });
      return (): void => sub.unsubscribe();
    }
  }, [isApiReady, api, header]);

  return <RelayerContext.Provider value={{ feeds }}>{children}</RelayerContext.Provider>;
}
