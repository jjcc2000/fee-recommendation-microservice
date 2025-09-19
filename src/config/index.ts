import 'dotenv/config';

export const PORT = Number(process.env.PORT || 3000);
export const RPC_URL = process.env.RPC_URL!;
export const BLOCK_WINDOW = Number(process.env.BLOCK_WINDOW || 200);
export const DEFAULT_PRIORITY_GWEI = Number(process.env.DEFAULT_PRIORITY_GWEI || 2);

if (!RPC_URL) {
  console.error('Missing RPC_URL in .env');
  process.exit(1);
}

export type Sample = {
  x: number[]; // features
  y: number;   // label (next baseFee gwei)
};
