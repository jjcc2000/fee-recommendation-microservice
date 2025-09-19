// src/utils/typeGuards.ts
export function isDefined<T>(x: T | undefined | null): x is T {
  return x !== undefined && x !== null;
}

export function assertDefined<T>(x: T | undefined | null, msg = 'Value is undefined'): asserts x is T {
  if (x === undefined || x === null) throw new Error(msg);
}
