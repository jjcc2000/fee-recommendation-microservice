import { getRecentBlocks, blocksToDataset } from '../data/blockFetcher.js';
import { trainDuration, modelLossGauge } from '../metrics/registry.js';
import { fitLinearRegression, type LinReg } from '../model/linreg.js';

let model: LinReg | null = null;

export async function bootstrapTrain(blockWindow?: number) {
  const blocks = await getRecentBlocks(blockWindow);
  const samples = blocksToDataset(blocks);

  const endTimer = trainDuration.startTimer();
  model = fitLinearRegression(samples);
  endTimer();

  if (model) modelLossGauge.set(model.mse);
  return { samples: samples.length, mse: model?.mse ?? null };
}

export function getModel() {
  return model;
}

export function setModel(m: LinReg | null) {
  model = m;
}
