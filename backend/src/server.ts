import * as http from 'http';
import { Registry } from 'prom-client';

// exposes endpoint for Prometheus metrics
export function startServer(port: number, register: Registry): void {
  http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      const metrics = await register.metrics();
      res.setHeader('Content-Type', register.contentType);
      res.end(metrics);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  }).listen(port);
}
