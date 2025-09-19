import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const fetchBlocksDuration = new client.Histogram({
  name: 'pipeline_fetch_blocks_seconds',
  help: 'Time to fetch and prepare blocks',
  buckets: [0.5, 1, 2, 5, 10, 20]
});

export const trainDuration = new client.Histogram({
  name: 'pipeline_train_seconds',
  help: 'Model training time (seconds)',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2]
});

export const inferenceDuration = new client.Histogram({
  name: 'pipeline_inference_ms',
  help: 'Inference latency (ms)',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20]
});

export const modelLossGauge = new client.Gauge({
  name: 'pipeline_last_train_loss',
  help: 'Last training loss (MSE)'
});

export const lastBaseFeeGauge = new client.Gauge({
  name: 'chain_last_base_fee_gwei',
  help: 'Latest observed base fee (gwei)'
});

registry.registerMetric(fetchBlocksDuration);
registry.registerMetric(trainDuration);
registry.registerMetric(inferenceDuration);
registry.registerMetric(modelLossGauge);
registry.registerMetric(lastBaseFeeGauge);

export default registry;
