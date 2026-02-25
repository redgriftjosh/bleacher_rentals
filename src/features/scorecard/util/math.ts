export function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
