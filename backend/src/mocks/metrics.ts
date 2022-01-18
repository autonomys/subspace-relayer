import { IMetrics } from '../metrics';

class MetricsMock implements IMetrics {
  contentType: string;

  constructor() {
    this.contentType = 'random content type';
  }

  public incBatches(): void {
    return;
  }

  public incBlocks(): void {
    return;
  }

  public getMetrics(): Promise<string> {
    return Promise.resolve('metrics data');
  }
}

export default new MetricsMock();
