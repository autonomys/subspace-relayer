interface Db {
  get(key: string): Buffer
}

export const createDbMock = (blocks: Buffer[]): Db => ({
  get(query: string | Buffer) {
    if (query === 'last-downloaded-block') {
      const buf = Buffer.alloc(8);
      buf.writeUInt8(blocks.length, 0);
      return buf;
    }

    const index = Number((query as Buffer).readBigUInt64LE(0)) - 1;

    return blocks[index];
  }
})
