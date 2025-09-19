import { Router } from 'express';
import { z } from 'zod';
import { DEFAULT_PRIORITY_GWEI } from '../config/index.js';
import { inferenceDuration } from '../metrics/registry.js';
import { getModel } from '../services/trainingService.js';
import { getLatestBlock } from '../data/blockFetcher.js';
import { predict } from '../model/linreg.js';
import { formatUnits } from 'ethers';

const router = Router();

const RecommendSchema = z.object({
  priorityGwei: z.number().positive().max(1000).optional()
});

router.get('/recommend-fee', async (req, res) => {
  try {
    const latest = await getLatestBlock();
    if (!latest?.baseFeePerGas) {
      return res.status(503).json({ error: 'No baseFeePerGas available yet' });
    }

    const prevBaseFeeGwei = Number(formatUnits(latest.baseFeePerGas, 'gwei'));
    const gasUsedRatio = Number(latest.gasUsed) / Math.max(1, Number(latest.gasLimit));

    const end = inferenceDuration.startTimer();
    const predicted = predict(getModel(), prevBaseFeeGwei, gasUsedRatio) ?? prevBaseFeeGwei;
    end();

    const parsed = RecommendSchema.safeParse({
      priorityGwei: req.query.priorityGwei ? Number(req.query.priorityGwei) : undefined
    });
    const priority = parsed.success
      ? (parsed.data.priorityGwei ?? DEFAULT_PRIORITY_GWEI)
      : DEFAULT_PRIORITY_GWEI;

    const baseFeeGwei = predicted;
    const maxPriorityFeePerGasGwei = Math.max(0.1, priority);
    const maxFeePerGasGwei = baseFeeGwei * 1.125 + maxPriorityFeePerGasGwei;

    res.json({
      baseFeeGwei: Number(baseFeeGwei.toFixed(3)),
      maxPriorityFeePerGasGwei: Number(maxPriorityFeePerGasGwei.toFixed(3)),
      maxFeePerGasGwei: Number(maxFeePerGasGwei.toFixed(3)),
      features: { prevBaseFeeGwei, gasUsedRatio: Number(gasUsedRatio.toFixed(4)) },
      modelReady: Boolean(getModel())
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'unknown error' });
  }
});

export default router;
