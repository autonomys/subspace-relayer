import { u64, Struct } from "@polkadot/types";

export interface ParachainProps {
  url: string;
  paraId: number;
  feedId: number;
  chain: string;
  chainName: string;
  web: string;
  explorer: string;
}

export interface Totals extends Struct {
  readonly size_: u64;
  readonly count: u64;
}

export interface Feed {
  hash: string;
  number: number;
}
