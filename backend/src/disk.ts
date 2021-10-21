import { BN } from '@polkadot/util';
import { Logger } from "pino";
import { ChainName } from './types';

class Disk {
    private readonly logger: Logger;
    private readonly chain: ChainName;
    private readonly path: string;

    constructor({ logger, chain, path }: { logger: Logger, chain: ChainName, path: string }) {
        this.logger = logger;
        this.chain = chain;
        this.path = path;
    }

    getBlock(blockNumber: BN): Promise<Uint8Array> {

    }
}

export default Disk;
