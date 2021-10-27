import { BN, u8aToHex } from '@polkadot/util';
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import { ApiPromise } from "@polkadot/api";
import { Observable } from "@polkadot/types/types";
import { U64 } from "@polkadot/types/primitive";
import { AddressOrPair } from "@polkadot/api/submittable/types";
import { Header } from "@polkadot/types/interfaces";
import { Logger } from "pino";
import { concatMap, tap, expand, skip, catchError, filter } from "rxjs/operators";
import { from, defer, EMPTY, throwError, forkJoin, of } from 'rxjs';

import { toBlockTxData } from './utils';
import { TxData, ChainName } from "./types";
import State from './state';

interface ChainArchiveConstructorParams {
  api: ApiPromise;
  path: string;
  chain: ChainName;
  feedId: U64;
  logger: Logger;
  signer: AddressOrPair;
  state: State;
}

// custom error to throw when block resync is done in order to terminate observable and propagate values
class ResyncCompleted extends Error { }

class ChainArchive {
  // There are no TS types for `db` :(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly db: any;
  private readonly api: ApiPromise;
  private readonly chain: ChainName;
  private readonly feedId: U64;
  private readonly logger: Logger;
  private readonly state: State;
  private readonly signer: AddressOrPair;

  public constructor(params: ChainArchiveConstructorParams) {
    this.db = levelup(rocksdb(`${params.path}/db`));
    this.api = params.api;
    this.chain = params.chain;
    this.feedId = params.feedId;
    this.logger = params.logger;
    this.signer = params.signer;
    this.state = params.state;
    this.getBlockByNumber = this.getBlockByNumber.bind(this);
    this.getLastProcessedBlockNumber = this.getLastProcessedBlockNumber.bind(this);
    this.getBlockNumberToProcess = this.getBlockNumberToProcess.bind(this);
    this.getNextBlockNumber = this.getNextBlockNumber.bind(this);
    this.isPayloadWithinSizeLimit = this.isPayloadWithinSizeLimit.bind(this);
  }

  private getBlockByNumber(blockNumber: BN): Promise<Uint8Array> {
    const blockNumberBytes = Buffer.from(BigUint64Array.of(BigInt(blockNumber.toNumber())).buffer);
    return this.db.get(blockNumberBytes);
  }

  public getBlocks(): Observable<TxData> {
    this.logger.info('Start processing blocks from archive');
    return this.getNextBlockNumber()
      .pipe(concatMap((blockNumber) => forkJoin([
        of(blockNumber),
        from(this.getBlockByNumber(blockNumber))
      ])))
      .pipe(concatMap(async ([blockNumber, blockBytes]) => {
        const hash = await this.api.rpc.chain.getBlockHash(blockNumber)
        this.logger.info(`${this.chain} - processing archived block: ${hash}, height: ${(blockNumber as BN).toString()}`);

        return toBlockTxData({
          block: u8aToHex(blockBytes),
          number: blockNumber,
          hash,
          feedId: this.feedId,
          chain: this.chain,
          signer: this.signer
        });
      }))
      .pipe(filter(this.isPayloadWithinSizeLimit))
      // TODO: consider saving last processed block after transaction is sent (move to Target)
      .pipe(tap(({ metadata }) => this.state.saveLastProcessedBlock(this.chain, metadata.number)))
  }

  getNextBlockNumber(): BN {
    return defer(this.getLastProcessedBlockNumber)
      // recursively check last processed block number and calculate difference with current finalized block number
      .pipe(expand(this.getBlockNumberToProcess))
      // use skip because first value is last processed block, we need next one
      .pipe(skip(1))
      // use catchError to complete stream instead of takeWhile because latter completes stream immediately without propagating values
      .pipe(catchError((error) => {
        if (error instanceof ResyncCompleted) {
          return EMPTY;
        } else {
          return throwError(() => error);
        }
      }))
  }

  private async getLastProcessedBlockNumber(): Promise<string | undefined> {
    const number = await this.state.getLastProcessedBlockByName(this.chain);
    this.logger.debug(`Last processed block number in state: ${number}`);
    return number;
  }

  private async getBlockNumberToProcess(blockNumber: string | undefined): Promise<BN> {
    // if getLastProcessedBlockNumber returns undefined we have to process from genesis
    if (!blockNumber) return new BN(0);
    const blockNumberAsBn = new BN(blockNumber);
    this.logger.debug(`Last processed block: ${blockNumberAsBn}`);
    const nextBlockNumber = blockNumberAsBn.add(new BN(1));

    // TODO: check if calculating diff is still needed
    const { number: finalizedNumber } = await this.getFinalizedHeader();
    const diff = finalizedNumber.toBn().sub(nextBlockNumber);
    this.logger.info(`Processing blocks from ${nextBlockNumber}`);
    this.logger.debug(`Finalized block: ${finalizedNumber}`);
    this.logger.debug(`Diff: ${diff}`);

    if (diff.isZero()) throw new ResyncCompleted();

    return nextBlockNumber;
  }

  private async getFinalizedHeader(): Promise<Header> {
    const finalizedHash = await this.api.rpc.chain.getFinalizedHead();
    const finalizedHeader = await this.api.rpc.chain.getHeader(finalizedHash);
    return finalizedHeader;
  }

  // check if block tx payload does not exceed 5 MB size limit
  // reference https://github.com/paritytech/substrate/issues/3174#issuecomment-514539336, values above and below were tested as well
  isPayloadWithinSizeLimit(txPayload: TxData): boolean {
    const txPayloadSize = Buffer.byteLength(JSON.stringify(txPayload));
    const txSizeLimit = 5000000; // 5 MB
    this.logger.debug(`${txPayload.chain}:${txPayload.metadata.number} tx payload size: ${txPayloadSize}`);

    if (txPayloadSize >= txSizeLimit) {
      this.logger.error(`${txPayload.chain}:${txPayload.metadata.number} tx payload size exceeds 5 MB`);
      return false
    } else {
      return true;
    }
  }
}

export default ChainArchive;
