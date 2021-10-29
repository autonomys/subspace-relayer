import * as dotenv from "dotenv";
import { ChainName, ParachainConfigType } from './types';

dotenv.config();

interface SourceChain {
  url: string;
  parachains: ParachainConfigType[];
}

interface Archive {
  path: string;
  url: string;
}

interface ConfigParams {
  accountSeed: string | undefined;
  targetChainUrl: string | undefined;
  sourceChains: SourceChain[];
  archives: Archive[];
}

class Config {
  public readonly accountSeed: string;
  public readonly targetChainUrl: string;
  public readonly sourceChains: SourceChain[];
  public readonly archives: Archive[];

  constructor(params: ConfigParams) {
    if (!params.accountSeed) {
      throw new Error("Seed is not provided");
    }

    if (!params.targetChainUrl) {
      throw new Error("Target chain endpoint url is not provided");
    }
    this.accountSeed = params.accountSeed;
    this.targetChainUrl = params.targetChainUrl;
    this.sourceChains = params.sourceChains;
    this.archives = params.archives;
  }
}

export const sourceChains = [
  {
    url: "wss://kusama-rpc.polkadot.io",
    parachains: [
      {
        url: "https://kusama-statemine-rpc.paritytech.net",
        paraId: 1000,
        chain: "Statemine" as ChainName,
      },
      {
        url: "https://karura.api.onfinality.io/public",
        paraId: 2000,
        chain: "Karura" as ChainName,
      },
      {
        url: "https://bifrost-parachain.api.onfinality.io/public",
        paraId: 2001,
        chain: "Bifrost" as ChainName,
      },
      {
        url: "https://khala.api.onfinality.io/public",
        paraId: 2004,
        chain: "Khala Network" as ChainName,
      },
      {
        url: "https://shiden.api.onfinality.io/public",
        paraId: 2007,
        chain: "Shiden" as ChainName,
      },
      {
        url: "https://moonriver.api.onfinality.io/public",
        paraId: 2023,
        chain: "Moonriver" as ChainName,
      },
      {
        url: "https://calamari.api.onfinality.io/public",
        paraId: 2084,
        chain: "Calamari" as ChainName,
      },
      {
        url: "https://spiritnet.api.onfinality.io/public",
        paraId: 2086,
        chain: "Kilt Spiritnet" as ChainName,
      },
      {
        url: "https://basilisk.api.onfinality.io/public",
        paraId: 2090,
        chain: "Basilisk" as ChainName,
      },
      {
        url: "https://altair.api.onfinality.io/public",
        paraId: 2088,
        chain: "Altair" as ChainName,
      },
      {
        url: "https://parallel-heiko.api.onfinality.io/public",
        paraId: 2085,
        chain: "Parallel Heiko" as ChainName,
      },
      {
        url: "https://kintsugi.api.onfinality.io/public",
        paraId: 2092,
        chain: "Kintsugi BTC" as ChainName,
      },
    ]
  },
];

export const archives = [
  {
    url: "wss://kusama-rpc.polkadot.io",
    path: "/Users/apple/Downloads/kusama-archive-2021-oct-23",
  }
]

export default Config;
