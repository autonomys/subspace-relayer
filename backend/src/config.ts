import * as dotenv from "dotenv";
import { ParachainConfigType } from './types';

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

export default Config;
