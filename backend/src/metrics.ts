import * as prom from 'prom-client';
import { ChainName } from './types';

export interface IMetrics {
  contentType: string;
  incBatches(chain: ChainName): void;
  incBlocks(chain: ChainName, value?: number): void;
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
      help: 'The total number of processed blocks',
      labelNames: ['chain'] as const,
    });

    this.batchCounter = new prom.Counter({
      name: 'batches_total',
      help: 'The total number of submitted batches',
      labelNames: ['chain'] as const,
    });
  }

  public incBatches(chain: ChainName): void {
    this.batchCounter.inc({ chain });
  }

  public incBlocks(chain: ChainName, value?: number): void {
    this.blockCounter.inc({ chain }, value);
  }

  public getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}

export default Metrics;
