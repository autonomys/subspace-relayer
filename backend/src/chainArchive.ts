import { blake2AsU8a } from '@polkadot/util-crypto';
import * as fsp from "fs/promises";
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import { Logger } from "pino";
import { TypeRegistry } from '@polkadot/types';

import { getHeaderLength } from './utils';
import { BlockMetadata } from "./types";

interface ChainArchiveConstructorParams {
  path: string;
  logger: Logger;
}

export class ArchivedBlock {
  public constructor(
    public readonly block: Buffer,
    public readonly metadata: BlockMetadata
  ) {
  }
}

class ChainArchive {
  // There are no TS types for `db` :(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly db: any;
  private readonly path: string;
  private readonly logger: Logger;
  // use TypeRegistry to create types Header and Hash instead of using polkadot.js WS API
  private readonly registry: TypeRegistry;

  public constructor(params: ChainArchiveConstructorParams) {
    this.db = levelup(rocksdb(`${params.path}/db`));
    this.path = params.path;
    this.logger = params.logger;
    this.getBlockByNumber = this.getBlockByNumber.bind(this);
    this.registry = new TypeRegistry();
  }

  private getBlockByNumber(blockNumber: number): Promise<Buffer> {
    const blockNumberBytes = Buffer.from(BigUint64Array.of(BigInt(blockNumber)).buffer);
    return this.db.get(blockNumberBytes);
  }

  private async getLastBlockNumberFromDb(): Promise<number> {
    const file = await fsp.readFile(`${this.path}/last-downloaded-block`, 'utf8');
    return parseInt(file, 10);
  }

  async *getBlocks(lastProcessedBlock: number): AsyncGenerator<ArchivedBlock, void> {
    this.logger.info('Start processing blocks from archive');

    const lastFromDb = await this.getLastBlockNumberFromDb();

    while (lastProcessedBlock <= lastFromDb) {
      const number = lastProcessedBlock + 1;
      const block = await this.getBlockByNumber(number);
      // get block hash by hashing block header (using Blake2) instead of requesting from RPC API
      const headerLength = getHeaderLength(block);
      const hash = this.registry.createType("Hash", blake2AsU8a(block.subarray(0, headerLength)));

      lastProcessedBlock = number;

      yield new ArchivedBlock(block, {
        number,
        hash,
      });
    }
  }
}

export default ChainArchive;
