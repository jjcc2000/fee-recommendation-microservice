import { formatUnits } from 'ethers';
import { getLatestBlock, getProvider } from '../data/blockFetcher.js';

export async function getCurrentBaseFeeGwei(): Promise<number | null> {
    const latest = await getLatestBlock();
    if (latest?.baseFeePerGas) {
        return Number(formatUnits(latest.baseFeePerGas, 'gwei'));
    }
    return null;
}

export async function getProviderFeeFallbackGwei(): Promise<{ base?: number; priority?: number }> {
    const provider = getProvider();
    const fd = await provider.getFeeData();

    const base = fd.maxFeePerGas ? Number(formatUnits(fd.maxFeePerGas, 'gwei')) : undefined;
    const priority = fd.maxPriorityFeePerGas ? Number(formatUnits(fd.maxPriorityFeePerGas, 'gwei')) : undefined;

    const out: { base?: number; priority?: number } = {};
    if (base !== undefined) out.base = base;
    if (priority !== undefined) out.priority = priority;
    return out;
}

export async function getNetworkMeta() {
    const provider = getProvider();
    const [net, bn] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
    return { chainId: Number(net.chainId), blockNumber: bn };
}
