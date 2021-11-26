import { Logger } from "pino";
import { HexString } from "@polkadot/util/types";
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");

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
  private readonly logger: Logger;

  public constructor({ path, logger }: ChainArchiveConstructorParams) {
    this.db = levelup(rocksdb(`${path}/db`, { readOnly: true }));
    this.logger = logger;
  }

  private getBlockByNumber(blockNumber: number): Promise<Buffer> {
    const blockNumberBytes = Buffer.from(BigUint64Array.of(BigInt(blockNumber)).buffer);
    return this.db.get(blockNumberBytes);
  }

  private async getLastBlockNumberFromDb(): Promise<number> {
    // We know blocks will not exceed 53-bit integer
    return Number((await this.db.get('last-downloaded-block') as Buffer).readBigUInt64LE());
  }

  public async *getBlocks(lastProcessedBlock: number): AsyncGenerator<ArchivedBlock, void> {
    try {
      await this.db.open({ readOnly: true });

      this.logger.info('Start processing blocks from archive');

      const lastFromDb = await this.getLastBlockNumberFromDb();
      let nextBlockToProcess = lastProcessedBlock + 1;

      while (nextBlockToProcess <= lastFromDb) {
        const blockData = await this.getBlockByNumber(nextBlockToProcess);
        const blockHashLength = blockData[0];
        const hash: HexString = `0x${blockData.slice(1, blockHashLength + 1).toString('hex')}`;
        const blockBytes = blockData.slice(blockHashLength + 1);

        yield new ArchivedBlock(blockBytes, {
          number: nextBlockToProcess,
          hash,
        });

        nextBlockToProcess++;
      }
    } finally {
      await this.db.close();
    }
  }
}

export default ChainArchive;
