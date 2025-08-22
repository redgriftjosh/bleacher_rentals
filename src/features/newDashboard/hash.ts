/**
 * Fast, deterministic 2D integer hash → uint32.
 * Use it to derive "random" but repeatable values from (cellX, cellY).
 */
export function hash2(ix: number, iy: number): number {
  let x = (ix | 0) >>> 0;
  let y = (iy | 0) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x ^= Math.imul(x ^ (x >>> 13), 0x9e3779b1);
  y = Math.imul(y ^ (y >>> 16), 0x85ebca6b);
  y ^= Math.imul(y ^ (y >>> 13), 0xc2b2ae35);
  let n = x ^ ((y << 16) | (y >>> 16));
  n ^= n >>> 16;
  n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b);
  n ^= n >>> 16;
  return n >>> 0;
}
