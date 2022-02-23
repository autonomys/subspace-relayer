import * as fs from "fs";
import { z } from "zod";
import { ChainId } from "./types";

const AnyChainConfig = z.object({
  downloadedArchivePath: z.string().optional(),
  accountSeed: z.string(),
  feedId: z.number().refine((number) => number >= 0),
  wsUrls: z.array(z.string()),
});

const PrimaryChainConfig = AnyChainConfig.extend({
  headerToSyncFrom: z.number().optional(),
});

const ParachainConfig = AnyChainConfig.extend({
  paraId: z.number().refine((number): number is ChainId => number > 0),
});

export type PrimaryChainConfig = z.infer<typeof PrimaryChainConfig>;
export type ParachainConfig = z.infer<typeof ParachainConfig>;

const ChainFile = z.object({
  targetChainUrl: z.string(),
  primaryChain: PrimaryChainConfig,
  parachains: z.array(ParachainConfig),
});

export class Config {
  public readonly targetChainUrl: string;
  public readonly primaryChain: PrimaryChainConfig;
  public readonly parachains: ParachainConfig[];

  public constructor(configPath: string) {
    const config = ChainFile.parse(JSON.parse(fs.readFileSync(configPath, 'utf-8')));

    this.targetChainUrl = config.targetChainUrl;
    this.primaryChain = config.primaryChain;
    this.parachains = config.parachains;
  }
}

export default Config;
