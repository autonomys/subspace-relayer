// Small utility that will read relayer configuration and creates feeds for all accounts
import * as dotenv from "dotenv";
import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from "@polkadot/api";
import type { SignedBlock } from '@polkadot/types/interfaces/runtime';
import { BlockHash } from "@polkadot/types/interfaces";
import { Bytes } from "@polkadot/types";

import logger from "../logger";
import Config, { PrimaryChainConfig } from "../config";
import { getAccount } from "../account";
import { createFeed } from "./common";

dotenv.config();

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

function getAuthorities(block: SignedBlock): Bytes | void {
  for (const d of block.block.header.digest.logs) {
    if (d.isConsensus) {
      const [engineId, log] = d.asConsensus;

      if (engineId.toString() === 'FRNK') {
        return log;
      }
    }
  }

  return;
}

async function getSetId(api: ApiPromise, blockHash: BlockHash) {
  const apiAt = await api.at(blockHash);
  const setId = await apiAt.query.grandpa.currentSetId();
  return setId;
}

(async () => {
  logger.info(`Connecting to target chain ${config.targetChainUrl}...`);

  const targetApi = await ApiPromise.create({
    provider: new WsProvider(config.targetChainUrl),
    types: {
      ChainType: {
        _enum: ['PolkadotLike']
      },
      InitialValidation: {
        chainType: "ChainType",
        header: "Vec<u8>",
        authorityList: "Vec<u8>",
        setId: "SetId",
      }
    }
  });

  logger.info(`Connecting to source chain ${config.primaryChain.wsUrls[0]}...`);

  const sourceApi = await ApiPromise.create({
    provider: new WsProvider(config.primaryChain.wsUrls),
  });

  try {
    for (const chainConfig of [config.primaryChain, ...config.parachains]) {
      const account = getAccount(chainConfig.accountSeed);
      logger.info(`Creating feed for account ${account.address}...`);

      const isRelay = chainConfig.feedId === 0 || chainConfig.feedId === 17; // Kusama feeId: 0, Polkadot feedId: 17

      let initialValidation;

      // initialize grandpa finality verifier for relay chain
      if (isRelay) {
        // get header to start verification from
        const blockNumber = (chainConfig as PrimaryChainConfig).headerToSyncFrom;
        const hash = await sourceApi.rpc.chain.getBlockHash(blockNumber);
        const header = await sourceApi.rpc.chain.getHeader(hash);
        const block = await sourceApi.rpc.chain.getBlock(hash);
        const authorityList = getAuthorities(block);

        if (!authorityList) {
          throw Error("Block number to sync from has no authorities");
        }

        const setId = await getSetId(sourceApi, hash);
        const chainType = (await targetApi.createType("ChainType", "PolkadotLike")).toHex();

        initialValidation = targetApi.createType("InitialValidation", {
          chainType,
          header,
          authorityList,
          setId,
        });
      }

      const feedId = await createFeed(targetApi, account, initialValidation);

      if (feedId !== chainConfig.feedId) {
        logger.error(`!!! Expected feedId ${chainConfig.feedId}, but created feedId ${feedId}!`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.stack || String(error));
    } else {
      logger.error(String(error));
    }
    process.exit(1);
  } finally {
    targetApi.disconnect();
    sourceApi.disconnect();
  }
})();
