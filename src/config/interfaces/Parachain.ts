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
  web: string;
  explorer: string;
}

