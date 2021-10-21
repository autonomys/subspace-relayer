import { BN } from '@polkadot/util';
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");

class ChainArchive {
    // There are no TS types for `db` :(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly db: any;

    public constructor(path: string) {
        this.db = levelup(rocksdb(`${path}/db`));
    }

    public getBlock(blockNumber: BN): Promise<Uint8Array> {
        const blockNumberBytes = Buffer.from(BigUint64Array.of(BigInt(blockNumber.toNumber())).buffer);
        return this.db.get(blockNumberBytes);
    }
}

export default ChainArchive;
