// Small utility that will read relayer configuration and creates feeds for all accounts
import logger from "../logger";
import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";

import Config, { PrimaryChainConfig } from "../config";
import { getAccount } from "../account";
import { createFeed } from "./common";

dotenv.config();

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

(async () => {
  logger.info(`Connecting to target chain ${config.targetChainUrl}...`);
  
  const targetApi = await ApiPromise.create({
    provider: new WsProvider(config.targetChainUrl),
  });
  
  logger.info(`Connecting to source chain ${config.primaryChain.wsUrls[0]}...`);
  
  const sourceApi = await ApiPromise.create({
    provider: new WsProvider(config.primaryChain.wsUrls),
  });

  for (const chainConfig of [config.primaryChain, ...config.parachains]) {
    const account = getAccount(chainConfig.accountSeed);
    logger.info(`Creating feed for account ${account.address}...`);

    const isRelay = chainConfig.feedId === 0 || chainConfig.feedId === 17; // Kusama feeId: 0, Polkadot feedId: 17

    const feedId = await createFeed(targetApi, account, isRelay);

    if (feedId !== chainConfig.feedId) {
      logger.error(`!!! Expected feedId ${chainConfig.feedId}, but created feedId ${feedId}!`);
    }

    // initialize grandpa finality verifier for relay chain
    if (isRelay) {
      // get header to start verification from
      const blockNumber = (chainConfig as PrimaryChainConfig).headerToSyncFrom;
      const hash = await sourceApi.rpc.chain.getBlockHash(blockNumber);
      const header = await sourceApi.rpc.chain.getHeader(hash);

      // TODO: get authority list and set id

      const unsub = await targetApi.tx.grandpaFinalityVerifier
        .initialize({
          chainId: 1,
          chainType: '',
          header,
          authorityList: [],
          setId: 0,
        })
        .signAndSend(account, { nonce: -1 }, (result) => {
          if (result.status.isInBlock) {
            const success = result.dispatchError ? false : true;
            logger.info(`📀 Transaction included at blockHash ${result.status.asInBlock} [success = ${success}]`);
            unsub();
          } else if (result.status.isBroadcast) {
            logger.info(`🚀 Transaction broadcasted`);
          } else if (result.isError) {
            logger.error('Transaction submission failed');
            unsub();
          } else {
            logger.info(`🤷 Other status ${result.status}`);
          }
        });
    }
  }

  targetApi.disconnect();
  sourceApi.disconnect();
})();
