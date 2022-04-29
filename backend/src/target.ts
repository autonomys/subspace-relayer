import { ApiPromise } from "@polkadot/api";
import { Logger } from "pino";
import { Hash } from "@polkadot/types/interfaces";
import { U64 } from "@polkadot/types/primitive";

import { SignerWithAddress, ChainName } from "./types";
import { IMetrics } from './metrics';

interface TargetConstructorParams {
  api: ApiPromise;
  logger: Logger;
  targetChainUrl: string;
  metrics: IMetrics;
}

class Target {
  public readonly api: ApiPromise;
  public readonly targetChainUrl: string;
  private readonly logger: Logger;
  private readonly metrics: IMetrics;

  constructor({ api, logger, targetChainUrl, metrics }: TargetConstructorParams) {
    this.api = api;
    this.logger = logger;
    this.targetChainUrl = targetChainUrl;
    this.metrics = metrics;
  }

  public sendBlockTx(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    block: Buffer,
    nonce: bigint,
  ): Promise<Hash> {
    this.logger.debug(`Sending ${chainName} block to feed ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    return new Promise<Hash>((resolve, reject) => {
      let unsub: () => void;
      this.api.tx.feeds
        .put(feedId, `0x${block.toString('hex')}`)
        .signAndSend(signer.address, { nonce, signer }, (result) => {
          if (result.isError) {
            reject(new Error(result.status.toString()));
            unsub();
          } else if (result.status.isInBlock) {
            // update metrics block counter
            this.metrics.incBlocks(chainName);
            resolve(result.status.asInBlock);
            unsub();
          }
        })
        .then((unsubLocal) => {
          unsub = unsubLocal;
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  public sendBlocksBatchTx(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    txData: Buffer[],
    nonce: bigint,
  ): Promise<Hash> {
    this.logger.debug(`Sending ${txData.length} ${chainName} blocks to feed ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    const putCalls = txData.map((block: Buffer) => {
      return this.api.tx.feeds.put(feedId, `0x${block.toString('hex')}`);
    });

    return new Promise<Hash>((resolve, reject) => {
      let unsub: () => void;
      this.api.tx.utility
        .batchAll(putCalls)
        .signAndSend(signer.address, { nonce, signer }, (result) => {
          if (result.isError) {
            reject(new Error(result.status.toString()));
            unsub();
          } else if (result.status.isInBlock) {
            // update metric counters
            this.metrics.incBatches(chainName);
            this.metrics.incBlocks(chainName, txData.length);
            resolve(result.status.asInBlock);
            unsub();
          }
        })
        .then((unsubLocal) => {
          unsub = unsubLocal;
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
}

export default Target;
