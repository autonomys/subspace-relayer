import { ApiPromise } from "@polkadot/api";
import { Subscription } from "rxjs";
import { Logger } from "pino";
import { ISubmittableResult } from "@polkadot/types/types";
import { Hash } from "@polkadot/types/interfaces";
import { U64 } from "@polkadot/types/primitive";

import { SignerWithAddress, TxData, BatchTxBlock } from "./types";

// TODO: remove hardcoded url
const polkadotAppsUrl =
  "https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer/query/";

interface TargetConstructorParams {
  api: ApiPromise;
  logger: Logger;
}

class Target {
  public readonly api: ApiPromise;
  private readonly logger: Logger;

  constructor({ api, logger }: TargetConstructorParams) {
    this.api = api;
    this.logger = logger;
    this.sendBlockTx = this.sendBlockTx.bind(this);
    this.logTxResult = this.logTxResult.bind(this);
  }

  private logTxResult({ status, events }: ISubmittableResult, subscription: Subscription) {
    if (status.isInBlock) {
      const isExtrinsicFailed = events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(({ event }) => (event as any).isSystem)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find(({ event }) => (event as any).asSystem.isExtrinsicFailed);

      if (isExtrinsicFailed) {
        this.logger.error("Extrinsic failed");
      } else {
        this.logger.debug(
          `Transaction included: ${polkadotAppsUrl}${status.asInBlock}`
        );
      }
      subscription.unsubscribe();
    }
  }

  public sendBlockTx({ feedId, block, metadata, chainName, signer }: TxData, nonce?: number): Promise<Hash> {
    this.logger.debug(`Sending ${chainName} block ${metadata.number} to feed: ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    return new Promise((resolve, reject) => {
      let unsub: () => void;
      this.api.tx.feeds
        .put(feedId, `0x${block.toString('hex')}`, JSON.stringify(metadata))
        // it is required to specify nonce, otherwise transaction within same block will be rejected
        // if nonce is -1 API will do the lookup for the right value
        // https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-take-the-pending-tx-pool-into-account-in-my-nonce
        .signAndSend(signer.address, { nonce: nonce || -1, signer }, (result) => {
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
    signer: SignerWithAddress,
    txData: BatchTxBlock[],
    nonce?: bigint,
  ): Promise<Hash> {
    this.logger.debug(`Sending ${txData.length} blocks to feed: ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    const putCalls = txData.map(({ block, metadata }: BatchTxBlock) => {
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
        // it is required to specify nonce, otherwise transaction within same block will be rejected
        // if nonce is -1 API will do the lookup for the right value
        // https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-take-the-pending-tx-pool-into-account-in-my-nonce
        .signAndSend(signer.address, { nonce: nonce || -1, signer }, (result) => {
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
