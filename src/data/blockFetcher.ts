import { JsonRpcProvider, formatUnits, Block } from 'ethers';
import { fetchBlocksDuration, lastBaseFeeGauge } from '../metrics/registry.js';

import {
    BLOCK_WINDOW,
    RPC_URL,
    FETCH_MAX_CONCURRENCY,
    FETCH_RETRIES,
    FETCH_BACKOFF_MS,
    BLOCK_STEP
} from '../config/index.js';

import { isDefined } from '../utils/typeGuards.js';


const provider = new JsonRpcProvider(RPC_URL);


const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));


export async function getRecentBlocks(n = BLOCK_WINDOW): Promise<Block[]> {
    const endBlock = await provider.getBlockNumber();

    // step to reduce pressure (e.g., 1 = every block, 3 = every 3rd)
    const heights: number[] = [];
    const start = Math.max(0, endBlock - n + 1);
    for (let h = start; h <= endBlock; h += BLOCK_STEP) heights.push(h);

    const endTimer = fetchBlocksDuration.startTimer();

    const blocks = await mapPool(heights, FETCH_MAX_CONCURRENCY, async (h) => {
        return await withRetry(() => provider.getBlock(h));
    });

    endTimer();

    // filter null/undefined (rate limit or pre-London nulls)
    return (blocks.filter(Boolean) as Block[]).sort((a, b) => a.number - b.number);
}

type Sample = { x: number[]; y: number };

function isRateLimit(err: unknown): boolean {
    const msg = String((err as any)?.message ?? '');
    const code = (err as any)?.code;
    // Infura “Too Many Requests” shows up with -32005 or BAD_DATA/SERVER_ERROR text
    return msg.includes('Too Many Requests') || msg.includes('429') || code === -32005;
}

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


async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let delay = FETCH_BACKOFF_MS;
    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (e) {
            if (attempt === FETCH_RETRIES || !isRateLimit(e)) throw e;
            await sleep(delay);
            delay = Math.min(delay * 2, 5000); // cap backoff
        }
    }
    // unreachable
    throw new Error('withRetry exhausted');
}

async function mapPool<T, R>(
    items: readonly T[],
    limit: number,
    mapper: (x: T) => Promise<R>
): Promise<(R | undefined)[]> {
    const results: (R | undefined)[] = new Array(items.length);
    let i = 0;

    async function worker() {
        for (; ;) {
            const idx = i++;
            if (idx >= items.length) return;

            const item = items[idx];
            if (item === undefined) {
                // noUncheckedIndexedAccess => guard required
                results[idx] = undefined;
                continue;
            }
            try {
                results[idx] = await mapper(item);
            } catch {
                // leave hole as undefined on error
                results[idx] = undefined;
            }
        }
    }

    const n = Math.max(1, Math.floor(limit));
    await Promise.all(Array.from({ length: n }, () => worker()));
    return results;
}



export async function getLatestBlock() {
    return provider.getBlock('latest');
}

export function getProvider() {
    return provider;
}
