import { BN, u8aToHex } from '@polkadot/util';
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import { ApiPromise } from "@polkadot/api";
import { U64 } from "@polkadot/types/primitive";
import { AddressOrPair } from "@polkadot/api/submittable/types";
import { Logger } from "pino";
import * as fsp from "fs/promises";
// import { blake2AsHex, blake2AsU8a } from '@polkadot/util-crypto';
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

class ChainArchive {
  // There are no TS types for `db` :(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly db: any;
  private readonly path: string;
  private readonly api: ApiPromise;
  private readonly chain: ChainName;
  private readonly feedId: U64;
  private readonly logger: Logger;
  private readonly state: State;
  public readonly signer: AddressOrPair;

  public constructor(params: ChainArchiveConstructorParams) {
    this.db = levelup(rocksdb(`${params.path}/db`));
    this.path = params.path;
    this.api = params.api;
    this.chain = params.chain;
    this.feedId = params.feedId;
    this.logger = params.logger;
    this.signer = params.signer;
    this.state = params.state;
    this.getBlockByNumber = this.getBlockByNumber.bind(this);
    this.isPayloadWithinSizeLimit = this.isPayloadWithinSizeLimit.bind(this);
  }

  private getBlockByNumber(blockNumber: BN): Promise<Uint8Array> {
    const blockNumberBytes = Buffer.from(BigUint64Array.of(BigInt(blockNumber.toNumber())).buffer);
    return this.db.get(blockNumberBytes);
  }

  private async getLastBlockNumberFromDb(): Promise<BN> {
    const file = await fsp.readFile(`${this.path}/last-downloaded-block`, 'utf8');
    return new BN(file);
  }

  async *getBlocks(): AsyncGenerator<TxData, void, unknown> {
    this.logger.info('Start processing blocks from archive');

    const lastFromDb = await this.getLastBlockNumberFromDb();
    const lastProcessed = await this.state.getLastProcessedBlockByName(this.chain);
    let lastProcessedAsBN = lastProcessed ? new BN(lastProcessed) : new BN(0);

    while (lastProcessedAsBN.lt(lastFromDb)) {
      const blockNumber = lastProcessedAsBN.add(new BN(1));
      // TODO: hash block header instead of requesting one
      const hash = await this.api.rpc.chain.getBlockHash(blockNumber);
      const blockBytes = await this.getBlockByNumber(blockNumber);

      const data = toBlockTxData({
        block: u8aToHex(blockBytes),
        number: blockNumber,
        hash,
        feedId: this.feedId,
        chain: this.chain,
        signer: this.signer
      })

      lastProcessedAsBN = blockNumber;

      // TODO: consider saving last processed block after transaction is sent (move to Target)
      this.state.saveLastProcessedBlock(this.chain, blockNumber);

      if (this.isPayloadWithinSizeLimit(data)) {
        yield data;
      } else {
        this.logger.error(`${data.chain}:${blockNumber} tx payload size exceeds 5 MB`);
      }
    }
  }

  // check if block tx payload does not exceed 5 MB size limit
  // reference https://github.com/paritytech/substrate/issues/3174#issuecomment-514539336, values above and below were tested as well
  isPayloadWithinSizeLimit(txPayload: TxData): boolean {
    const txPayloadSize = Buffer.byteLength(JSON.stringify(txPayload));
    const txSizeLimit = 5000000; // 5 MB
    this.logger.debug(`${txPayload.chain}:${txPayload.metadata.number} tx payload size: ${txPayloadSize}`);

    return txPayloadSize <= txSizeLimit;
  }
}

export default ChainArchive;
