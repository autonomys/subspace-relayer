import * as fsp from "fs/promises";
import { BN } from '@polkadot/util';

import { ChainName } from './types';

// TODO: Retrieve these from the chain instead
class State {
  private readonly lastBlockPath: string;
  private readonly folder: string;

  public constructor({ folder }: { folder: string; }) {
    this.folder = folder;
    this.lastBlockPath = `${folder}/last_processed_block.json`;
  }

  public async readFileOrFallback(path: string): Promise<Record<string, string>> {
    let object;

    try {
      const file = await fsp.readFile(path, 'utf8');
      object = JSON.parse(file);
    } catch (error) {
      // TODO: add logger and log error
      try {
        await fsp.access(this.folder);
      } catch (error) {
        await fsp.mkdir(this.folder);
      }

      object = {}
    }

    return object;
  }

  public async saveLastProcessedBlock(chain: ChainName, number: BN): Promise<void> {
    const lastProcessedBlockRecord = await this.readFileOrFallback(this.lastBlockPath);

    lastProcessedBlockRecord[chain] = number;

    await fsp.writeFile(this.lastBlockPath, JSON.stringify(lastProcessedBlockRecord, null, 4));
  }

  public async getLastProcessedBlockByName(chain: ChainName): Promise<string | undefined> {
    const lastProcessedBlockRecord = await this.readFileOrFallback(this.lastBlockPath);

    return lastProcessedBlockRecord[chain];
  }
}

export default State;
