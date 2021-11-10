import { ApiPromise } from "@polkadot/api";
import { Logger } from "pino";
import { Hash } from "@polkadot/types/interfaces";
import { U64 } from "@polkadot/types/primitive";

import { SignerWithAddress, TxBlock, ChainName } from "./types";

interface TargetConstructorParams {
  api: ApiPromise;
  logger: Logger;
  targetChainUrl: string;
}

class Target {
  public readonly api: ApiPromise;
  public readonly targetChainUrl: string;
  private readonly logger: Logger;

  constructor({ api, logger, targetChainUrl }: TargetConstructorParams) {
    this.api = api;
    this.logger = logger;
    this.targetChainUrl = targetChainUrl;
  }

  public sendBlockTx(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    { block, metadata }: TxBlock,
    nonce: bigint,
  ): Promise<Hash> {
    this.logger.debug(`Sending ${chainName} block to feed: ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    return new Promise((resolve, reject) => {
      let unsub: () => void;
      this.api.tx.feeds
        .put(
          feedId,
          `0x${block.toString('hex')}`,
          `0x${metadata.toString('hex')}`,
        )
        .signAndSend(signer.address, { nonce, signer }, (result) => {
          if (result.isError) {
            reject(result.status.toString());
            unsub();
          } else if (result.status.isInBlock) {
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
    txData: TxBlock[],
    nonce: bigint,
  ): Promise<Hash> {
    this.logger.debug(`Sending ${txData.length}g ${chainName} blocks to feed: ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    const putCalls = txData.map(({ block, metadata }: TxBlock) => {
      return this.api.tx.feeds.put(
        feedId,
        `0x${block.toString('hex')}`,
        `0x${metadata.toString('hex')}`,
      );
    });

    return new Promise((resolve, reject) => {
      let unsub: () => void;
      this.api.tx.utility
        .batchAll(putCalls)
        .signAndSend(signer.address, { nonce, signer }, (result) => {
          if (result.isError) {
            reject(result.status.toString());
            unsub();
          } else if (result.status.isInBlock) {
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
