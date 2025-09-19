// src/model/linreg.ts
// OLS Linear Regression (no deps), strict TS safe (works with noUncheckedIndexedAccess)

export type LinReg = { bias: number; weights: number[]; mse: number };

/** Safe vector read */
function get(arr: number[], i: number): number {
  const v = arr[i];
  if (v === undefined) throw new Error(`vector index ${i} out of bounds`);
  return v;
}

/** Safe matrix row read */
function rowAt(mat: number[][], r: number): number[] {
  const row = mat[r];
  if (row === undefined) throw new Error(`matrix row ${r} out of bounds`);
  return row;
}

/** Validate a square matrix and a RHS vector length */
function validateSquare(A: number[][], b: number[]): number | null {
  const n = A.length;
  if (n === 0 || b.length !== n) return null;
  for (let i = 0; i < n; i++) {
    const row = A[i];
    if (!row || row.length !== n) return null;
    for (let j = 0; j < n; j++) {
      const v = row[j];
      if (!Number.isFinite(v)) return null;
    }
    const bv = b[i];
    if (!Number.isFinite(bv)) return null;
  }
  return n;
}

/** Solve A x = b with Gaussian elimination + partial pivoting. Returns null if singular/invalid. */
function solveLinearSystem(Ain: number[][], bIn: number[]): number[] | null {
  const n = validateSquare(Ain, bIn);
  if (n === null) return null;

  // Deep copy
  const A: number[][] = Array.from({ length: n }, (_, i) => rowAt(Ain, i).slice());
  const b: number[] = bIn.slice();

  for (let i = 0; i < n; i++) {
    // pivot search
    let pivot = i;
    let maxAbs = Math.abs(rowAt(A, i)[i]!);
    for (let r = i + 1; r < n; r++) {
      const val = Math.abs(rowAt(A, r)[i]!);
      if (val > maxAbs) { maxAbs = val; pivot = r; }
    }
    if (!(maxAbs > 1e-15) || !isFinite(maxAbs)) return null;

    // swap rows
    if (pivot !== i) {
      const tmp = rowAt(A, i).slice();
      A[i] = rowAt(A, pivot).slice();
      A[pivot] = tmp;
      const tb = b[i]; b[i] = b[pivot]!; b[pivot] = tb!;
    }

    const Ai = rowAt(A, i);
    const diag = Ai[i]!;
    for (let r = i + 1; r < n; r++) {
      const Ar = rowAt(A, r);
      const factor = Ar[i]! / diag;
      if (!isFinite(factor)) return null;

      Ar[i] = 0;
      for (let c = i + 1; c < n; c++) {
        Ar[c] = Ar[c]! - factor * Ai[c]!;
      }
      b[r] = b[r]! - factor * b[i]!;
    }
  }

  // back substitution
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const Ai = rowAt(A, i);
    let sum = b[i]!;
    for (let c = i + 1; c < n; c++) sum -= Ai[c]! * x[c]!;
    const diag = Ai[i]!;
    if (!(Math.abs(diag) > 1e-15) || !isFinite(diag)) return null;
    x[i] = sum / diag;
    if (!isFinite(x[i]!)) return null;
  }

  return x;
}

/** Fit OLS using normal equations. Works with any number of features. */
export function fitLinearRegression(samples: { x: number[]; y: number }[]): LinReg | null {
  if (samples.length < 6) return null;
  const d = samples[0]?.x?.length ?? 0;
  if (d <= 0) return null;

  // design size (bias + d features)
  const p = d + 1;
  // allocate symmetric XtX and vector Xty
  const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const Xty: number[] = Array(p).fill(0);

  let used = 0;
  for (const s of samples) {
    if (!s || !Array.isArray(s.x) || s.x.length !== d) continue;
    if (!Number.isFinite(s.y)) continue;
    let ok = true;
    for (let j = 0; j < d; j++) if (!Number.isFinite(s.x[j]!)) { ok = false; break; }
    if (!ok) continue;

    // row = [1, x1, x2, ...]
    const row: number[] = new Array(p);
    row[0] = 1;
    for (let j = 0; j < d; j++) row[j + 1] = s.x[j]!;

    for (let r = 0; r < p; r++) {
      Xty[r] = get(Xty, r) + row[r]! * s.y;
      for (let c = r; c < p; c++) {
        const val = row[r]! * row[c]!;
        const R = rowAt(XtX, r);
        R[c] = R[c]! + val;
      }
    }
    used++;
  }
  if (used < 6) return null;

  // mirror lower triangle
  for (let r = 0; r < p; r++) {
    const Rr = rowAt(XtX, r);
    for (let c = 0; c < r; c++) {
      Rr[c] = rowAt(XtX, c)[r]!;
    }
  }

  const theta = solveLinearSystem(XtX, Xty);
  if (!theta) return null;

  // compute MSE
  let sse = 0;
  let n = 0;
  for (const s of samples) {
    if (!s || !Array.isArray(s.x) || s.x.length !== d) continue;
    if (!Number.isFinite(s.y)) continue;
    let pred = theta[0]!;
    for (let j = 0; j < d; j++) pred += theta[j + 1]! * s.x[j]!;
    if (!Number.isFinite(pred)) continue;
    const err = pred - s.y;
    sse += err * err;
    n++;
  }
  if (n === 0) return null;

  return { bias: theta[0]!, weights: theta.slice(1) as number[], mse: sse / n };
}

/** Predict using fitted model. */
export function predict(lin: LinReg | null, ...features: number[]): number | null {
  if (!lin) return null;

  const w = lin.weights;
  if (features.length !== w.length) return null;

  let v = lin.bias;

  for (let j = 0; j < w.length; j++) {
    const fj = features[j];
    const wj = w[j];

    // Strict guards for noUncheckedIndexedAccess
    if (fj === undefined || wj === undefined) return null;
    if (!Number.isFinite(fj) || !Number.isFinite(wj)) return null;

    v += wj * fj;
  }

  return Number.isFinite(v) ? Math.max(0, v) : null;
}
