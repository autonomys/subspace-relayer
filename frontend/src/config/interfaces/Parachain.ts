import { u64, Struct } from "@polkadot/types";

export interface Totals extends Struct {
  readonly size_: u64;
  readonly count: u64;
}

export interface FeedTotals {
  feedId: number;
  size: number;
  count: number;
}

export interface ParachainProps {
  wss: string;
  paraId: number;
  feedId: number;
  chain: string;
  chainName: string;
  web: string;
  ecosystem: string;
  subspaceWss: string;
  filter?: number;
}

export interface ParachainFeed {
  feedId: number;
  hash: string;
  number: number;
  size: number;
  count: number;
  subspaceHash: string;
}
