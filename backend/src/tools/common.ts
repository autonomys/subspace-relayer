import { ApiPromise } from "@polkadot/api";

import { blockToBinary, blockNumberToBuffer } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAndStoreBlock(api: ApiPromise, blockNumber: number, db: any): Promise<void> {
    const blockHash = (await api.rpc.chain.getBlockHash(blockNumber)).toString();
    const blockBytes = blockToBinary(await api.rpc.chain.getBlock.raw(blockHash));
  
    const blockNumberAsBuffer = blockNumberToBuffer(blockNumber);
    const blockHashAsBuffer = Buffer.from(blockHash.slice(2), 'hex');
  
    await db.put(
      blockNumberAsBuffer,
      Buffer.concat([
        // Block hash length in bytes
        Buffer.from(Uint8Array.of(blockHashAsBuffer.byteLength)),
        // Block hash itself
        blockHashAsBuffer,
        // Block bytes in full
        blockBytes,
      ]),
    );
    await db.put('last-downloaded-block', blockNumberAsBuffer);
  }
