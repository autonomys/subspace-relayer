export interface ParachainProps  {
  name?: string;
  status?: string;
  explorer?: string;
  web?: string;
  lastUpdate?: number;
  lastBlockHeight?: number;
  lastBlockHash?: string;
  blockSize?: string;
  subspaceHash?: string;
  url: string;
  paraId: number;
  feedId: number;
  chain: string;
}

