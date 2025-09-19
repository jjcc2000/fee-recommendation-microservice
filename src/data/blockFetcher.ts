import { JsonRpcProvider, formatUnits, Block } from 'ethers';
import { BLOCK_WINDOW, RPC_URL } from '../config/index.js';
import { fetchBlocksDuration, lastBaseFeeGauge } from '../metrics/registry.js';

const provider = new JsonRpcProvider(RPC_URL);

export async function getRecentBlocks(n = BLOCK_WINDOW): Promise<Block[]> {
    const endBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, endBlock - n);

    const endTimer = fetchBlocksDuration.startTimer();
    const blocks: Block[] = [];
    for (let i = startBlock; i <= endBlock; i++) {
        const b = await provider.getBlock(i);
        if (b) blocks.push(b); // only push non-null
    }
    endTimer();

    return blocks;
}

type Sample = { x: number[]; y: number };

export function blocksToDataset(blocks: Block[]): Sample[] {
    const samples: Sample[] = [];

    for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1];
        const curr = blocks[i];

        if (!prev || !curr) continue;

        if (prev.baseFeePerGas == null || curr.baseFeePerGas == null) continue;

        const prevBaseFeeGwei = Number(formatUnits(prev.baseFeePerGas, 'gwei'));
        const prevGasUsed = Number(prev.gasUsed);
        const prevGasLimit = Number(prev.gasLimit);
        const gasUsedRatio = prevGasUsed / Math.max(1, prevGasLimit);

        const y = Number(formatUnits(curr.baseFeePerGas, 'gwei'));
        samples.push({ x: [prevBaseFeeGwei, gasUsedRatio], y });
    }

    const last = blocks.length ? blocks[blocks.length - 1] : undefined;
    if (last?.baseFeePerGas != null) {
        const latestGwei = Number(formatUnits(last.baseFeePerGas, 'gwei'));
        lastBaseFeeGauge.set(latestGwei);
    }

    return samples;
}

export async function getLatestBlock() {
    return provider.getBlock('latest');
}
