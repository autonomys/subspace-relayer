import * as http from 'http';
import Metrics from './metrics';

// exposes endpoint for Prometheus metrics
export function startServer(port: number, metrics: Metrics): void {
  http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      const data = await metrics.getMetrics();
      res.setHeader('Content-Type', metrics.contentType);
      res.end(data);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  }).listen(port);
}
