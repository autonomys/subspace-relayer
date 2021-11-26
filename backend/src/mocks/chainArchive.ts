import ChainArchive, { ArchivedBlock } from '../chainArchive';

import * as signedBlockMock from '../mocks/signedBlock.json';
import { blockToBinary } from '../utils';

export const blocksMock = [
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
]

class ChainArchiveMock {
  public async *getBlocks(_lastProcessedBlock: number): AsyncGenerator<ArchivedBlock, void> {
    for (let index = 0; index < blocksMock.length; index++) {
      const blockBuffer = blocksMock[index];

      yield new ArchivedBlock(blockBuffer, {
        number: index + 1,
        hash: '0xcf5fa8ef2fe76c0d6288535231d21989829933b986d32a3ba452173c5a2074f1',
      });
    }
  }
}

export const chainArchiveMock = new ChainArchiveMock() as unknown as ChainArchive;
