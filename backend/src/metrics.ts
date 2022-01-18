import * as prom from 'prom-client';

export interface IMetrics {
  contentType: string;
  incBatches(): void;
  incBlocks(value?: number): void;
  getMetrics(): Promise<string>;
}

class Metrics implements IMetrics {
  private readonly blockCounter: prom.Counter<string>;
  private readonly batchCounter: prom.Counter<string>;
  private readonly register: prom.Registry;
  public readonly contentType: string;

  public constructor() {
    this.contentType = prom.contentType;
    this.register = prom.register;

    prom.collectDefaultMetrics({
      register: this.register,
      prefix: "relayer_"
    });

    this.blockCounter = new prom.Counter({
      name: 'blocks_total',
      help: 'The total number of processed blocks'
    });

    this.batchCounter = new prom.Counter({
      name: 'batches_total',
      help: 'The total number of submitted batches'
    });
  }

  public incBatches(): void {
    this.batchCounter.inc();
  }

  public incBlocks(value?: number): void {
    this.blockCounter.inc(value);
  }

  public getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}

export default Metrics;
