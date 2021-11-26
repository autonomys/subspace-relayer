export class Db {
  public constructor(private readonly blocks: Buffer[]) {
  }

  public get(key: string | Buffer): Promise<Buffer> {
    if (key === 'last-downloaded-block') {
      const buf = Buffer.alloc(8);
      buf.writeUInt8(this.blocks.length, 0);
      return Promise.resolve(buf);
    }
    const index = Number((key as Buffer).readBigUInt64LE(0)) - 1;
    return Promise.resolve(this.blocks[index]);
  }
}
