import { ApiPromise } from "@polkadot/api";
import { BN } from '@polkadot/util';
import { Observable } from "@polkadot/types/types";
import { U64 } from "@polkadot/types/primitive";
import { Header, Hash, SignedBlock, Block } from "@polkadot/types/interfaces";
import { AddressOrPair } from "@polkadot/api/submittable/types";
import { concatMap, map, tap, concatAll, first, expand, skip, catchError, filter } from "rxjs/operators";
import { from, merge, EMPTY, defer, throwError } from 'rxjs';
import { Logger } from "pino";

import { ParaHeadAndId, TxData, ChainName } from "./types";
import { getParaHeadAndIdFromEvent, isRelevantRecord, toBlockTxData } from './utils';
import Parachain from "./parachain";
import State from './state';

// custom error to throw when block resync is done in order to terminate observable and propagate values
class ResyncCompleted extends Error { }

interface SourceConstructorParams {
  api: ApiPromise;
  chain: ChainName;
  feedId: U64;
  parachainsMap: Map<string, Parachain>;
  logger: Logger;
  signer: AddressOrPair;
  state: State;
}

class Source {
  private readonly api: ApiPromise;
  private readonly chain: ChainName;
  private readonly feedId: U64;
  private readonly parachainsMap: Map<string, Parachain>;
  private readonly logger: Logger;
  private readonly state: State;
  public readonly signer: AddressOrPair;

  constructor(params: SourceConstructorParams) {
    this.api = params.api;
    this.chain = params.chain;
    this.feedId = params.feedId;
    this.parachainsMap = params.parachainsMap;
    this.logger = params.logger;
    this.signer = params.signer;
    this.state = params.state;
    this.getBlocksByHash = this.getBlocksByHash.bind(this);
    this.getParablocks = this.getParablocks.bind(this);
    this.getLastProcessedBlockNumber = this.getLastProcessedBlockNumber.bind(this);
    this.getFinalizedHeader = this.getFinalizedHeader.bind(this);
    this.getBlockNumberToProcess = this.getBlockNumberToProcess.bind(this);
    this.isPayloadWithinSizeLimit = this.isPayloadWithinSizeLimit.bind(this);
  }

  subscribeHeads(): Observable<Header> {
    return this.api.rx.rpc.chain.subscribeFinalizedHeads();
  }

  private getBlock(hash: Hash): Observable<SignedBlock> {
    return this.api.rx.rpc.chain.getBlock(hash).pipe(first());
  }

  private async getFinalizedHeader(): Promise<Header> {
    const finalizedHash = await this.api.rpc.chain.getFinalizedHead();
    const finalizedHeader = await this.api.rpc.chain.getHeader(finalizedHash);
    return finalizedHeader;
  }

  private async getLastProcessedBlockNumber(): Promise<string | undefined> {
    const number = await this.state.getLastProcessedBlockByName(this.chain);
    this.logger.debug(`Last processed block number in state: ${number}`);
    return number;
  }

  async getBlockNumberToProcess(blockNumber: string | undefined): Promise<BN> {
    // if getLastProcessedBlockNumber returns undefined we have to process from genesis
    if (!blockNumber) return new BN(0);
    const blockNumberAsBn = this.api.createType("BlockNumber", blockNumber).toBn();
    this.logger.debug(`Last processed block: ${blockNumberAsBn}`);
    const nextBlockNumber = blockNumberAsBn.add(new BN(1));
    const { number: finalizedNumber } = await this.getFinalizedHeader();
    const diff = finalizedNumber.toBn().sub(nextBlockNumber);
    this.logger.info(`Processing blocks from ${nextBlockNumber}`);
    this.logger.debug(`Finalized block: ${finalizedNumber}`);
    this.logger.debug(`Diff: ${diff}`);

    if (diff.isZero()) throw new ResyncCompleted();

    return nextBlockNumber;
  }

  resyncBlocks(): Observable<TxData> {
    this.logger.info('Start queuing resync blocks');
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
      // get block hash for each block number
      .pipe(concatMap((blockNumber) => this.api.rx.rpc.chain.getBlockHash(blockNumber)))
      // process blocks by source chain block hash
      .pipe(concatMap(this.getBlocksByHash));
  }

  // TODO: refactor to return Observable<ParaHeadAndId>
  private async getParaHeadsAndIds(block: Block): Promise<ParaHeadAndId[]> {
    const blockRecords = await this.api.query.system.events.at(
      block.header.hash
    );

    const result: ParaHeadAndId[] = [];

    for (let index = 0; index < block.extrinsics.length; index++) {
      const { method } = block.extrinsics[index];

      if (method.section == "paraInherent" && method.method == "enter") {
        blockRecords
          .filter(isRelevantRecord(index))
          .map(({ event }) => getParaHeadAndIdFromEvent(event))
          .forEach((parablockData) => result.push(parablockData));
      }
    }

    this.logger.info(`Associated parablocks: ${result.length}`);
    this.logger.debug(`ParaIds: ${result.map(({ paraId }) => paraId).join(", ")}`);

    return result;
  }

  // TODO: add logging for individual parablocks
  getParablocks({ block }: SignedBlock): Observable<TxData> {
    return from(this.getParaHeadsAndIds(block))
      // print extracted para heads and ids
      .pipe(tap((paraHeadsAndIds) => paraHeadsAndIds
        .forEach(paraItem => this.logger.debug(`Extracted para head and id: ${JSON.stringify(paraItem)}`))))
      // converts Observable<ParaHeadAndId[]> to Observable<ParaHeadAndId>
      .pipe(concatAll())
      .pipe(
        concatMap(({ paraId, paraHead }) => {
          const parachain = this.parachainsMap.get(paraId);

          // skip parachains that are not included in config
          if (!parachain) {
            this.logger.error(`Uknown paraId: ${paraId}`);
            return EMPTY;
          }

          const { feedId, chain, signer } = parachain;

          return parachain.fetchParaBlock(paraHead)
            .pipe(map(({ block }) => {
              const blockStr = JSON.stringify(block);
              const number = this.api.createType("BlockNumber", block.header.number).toBn();
              return toBlockTxData({
                block: blockStr,
                number,
                hash: paraHead,
                feedId,
                chain,
                signer
              });
            }));
        })
      );
  }

  public getBlocksByHash(hash: Hash): Observable<TxData> {
    const relayBlock = this.getBlock(hash);
    const parablocks = relayBlock.pipe(concatMap(this.getParablocks));

    const relayBlockWithMetadata = relayBlock
      .pipe(map(({ block }) => {
        const blockStr = block.toString();
        const number = block.header.number.toBn();

        this.logger.info(`${this.chain} - processing block: ${hash}, height: ${number}`);

        return toBlockTxData({
          block: blockStr,
          number,
          hash,
          feedId: this.feedId,
          chain: this.chain,
          signer: this.signer
        });
      }))
      // TODO: consider saving last processed block after transaction is sent (move to Target)
      .pipe(tap(({ metadata }) => this.state.saveLastProcessedBlock(this.chain, metadata.number)));

    return merge(relayBlockWithMetadata, parablocks).pipe(filter(this.isPayloadWithinSizeLimit));
  }

  // check if block tx payload does not exceed 5 MB size limit
  // reference https://github.com/paritytech/substrate/issues/3174#issuecomment-514539336, values above and below were tested as well
  isPayloadWithinSizeLimit(txPayload: TxData): boolean {
    const txPayloadSize = Buffer.byteLength(JSON.stringify(txPayload));
    const txSizeLimit = 5000000; // 5 MB
    this.logger.debug(`${txPayload.chain}:${txPayload.metadata.number} tx payload size: ${txPayloadSize}`);

    if (txPayloadSize >= txSizeLimit) {
      this.logger.error(`${txPayload.chain}:${txPayload.metadata.number} tx payload size exceeds 5 MB`);
      process.exit(1);
    } else {
      return true;
    }
  }
}

export default Source;
