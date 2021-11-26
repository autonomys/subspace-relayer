import { ArchivedBlock } from '../chainArchive';
import * as signedBlockMock from '../mocks/signedBlock.json';
import { blockToBinary } from '../utils';

const blocks = [
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
]

export class ChainArchiveMock {
  public async *getBlocks(_lastProcessedBlock: number): AsyncGenerator<ArchivedBlock, void> {
    for (let index = 0; index < blocks.length; index++) {
      const blockBuffer = blocks[index];

      yield new ArchivedBlock(blockBuffer, {
        number: index + 1,
        hash: '0xcf5fa8ef2fe76c0d6288535231d21989829933b986d32a3ba452173c5a2074f1',
      });
    }
  }
}
