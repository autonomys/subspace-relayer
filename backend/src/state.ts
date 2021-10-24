import * as fsp from "fs/promises";
import { BN } from '@polkadot/util';

import { ChainName } from './types';

// TODO: consider providing fs methods to constructor
class State {
    lastBlockPath: string;
    feedsPath: string;
    folder: string;

    constructor({ folder }: { folder: string; }) {
        this.folder = folder;
        this.lastBlockPath = `${folder}/last_processed_block.json`;
        this.feedsPath = `${folder}/feeds.json`;
    }

    async readFileOrFallback(path: string): Promise<Record<string, string>> {
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

    async saveLastProcessedBlock(chain: ChainName, number: BN): Promise<void> {
        const lastProcessedBlockRecord = await this.readFileOrFallback(this.lastBlockPath);

        lastProcessedBlockRecord[chain] = number;

        await fsp.writeFile(this.lastBlockPath, JSON.stringify(lastProcessedBlockRecord, null, 4));
    }

    async getLastProcessedBlockByName(chain: ChainName): Promise<string | undefined> {
        const lastProcessedBlockRecord = await this.readFileOrFallback(this.lastBlockPath);

        return lastProcessedBlockRecord[chain];
    }

    async getFeedIdByAddress(address: string): Promise<string | undefined> {
        const feeds = await this.readFileOrFallback(this.feedsPath);

        return feeds[address];
    }

    async saveFeedId(address: string, feedId: BN): Promise<void> {
        const feeds = await this.readFileOrFallback(this.feedsPath);

        feeds[address] = feedId.toBn();

        await fsp.writeFile(this.feedsPath, JSON.stringify(feeds, null, 4));
    }
}

export default State;
