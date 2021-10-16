import { u64, Struct } from "@polkadot/types";

export interface ParachainProps {
  status?: string;
  lastUpdate?: number;
  lastBlockHeight?: number;
  lastBlockHash?: string;
  blockSize?: string;
  subspaceHash?: string;
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
  readonly objects: u64;
}
