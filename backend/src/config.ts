import * as fs from "fs";
import { z } from "zod";

const AnyChainConfig = z.object({
  downloadedArchivePath: z.string().optional(),
  httpUrl: z.string(),
});

export type AnyChainConfig = z.infer<typeof AnyChainConfig>;

const PrimaryChainConfig = AnyChainConfig.extend({
  wsUrl: z.string(),
});

export type PrimaryChainConfig = z.infer<typeof PrimaryChainConfig>;

const ChainConfig = z.object({
  primaryChain: PrimaryChainConfig,
  parachains: z.array(AnyChainConfig),
});

export type ChainConfig = z.infer<typeof ChainConfig>;

class Config {
  public readonly accountSeed: string;
  public readonly targetChainUrl: string;
  public readonly chainConfig: ChainConfig;

  constructor() {
    if (!process.env.ACCOUNT_SEED) {
      throw new Error(`"ACCOUNT_SEED" environment variable is required`);
    }

    // TODO: Move this to config object with seeds for every chain specified
    this.accountSeed = process.env.ACCOUNT_SEED;

    if (!process.env.TARGET_CHAIN_URL) {
      throw new Error(`"TARGET_CHAIN_URL" environment variable is required, set it to WS/WSS URL`);
    }

    this.targetChainUrl = process.env.TARGET_CHAIN_URL;

    if (!process.env.CHAIN_CONFIG_PATH) {
      throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
    }

    this.chainConfig = ChainConfig.parse(JSON.parse(fs.readFileSync(process.env.CHAIN_CONFIG_PATH, 'utf-8')));
  }
}

export default Config;
