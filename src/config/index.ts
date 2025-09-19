import 'dotenv/config';

export const PORT = Number(process.env.PORT || 3000);
export const RPC_URL = process.env.RPC_URL!;
export const BLOCK_WINDOW = Number(process.env.BLOCK_WINDOW || 200);
export const DEFAULT_PRIORITY_GWEI = Number(process.env.DEFAULT_PRIORITY_GWEI || 2);


export const FETCH_MAX_CONCURRENCY = Math.max(1, Number(process.env.FETCH_MAX_CONCURRENCY || 2));
export const FETCH_RETRIES = Math.max(0, Number(process.env.FETCH_RETRIES || 5));
export const FETCH_BACKOFF_MS = Math.max(0, Number(process.env.FETCH_BACKOFF_MS || 300));
export const BLOCK_STEP = Math.max(1, Number(process.env.BLOCK_STEP || 1));


if (!RPC_URL) {
    console.error('Missing RPC_URL in .env');
    process.exit(1);
}

export type Sample = {
    x: number[]; // features
    y: number;   // label (next baseFee gwei)
};
