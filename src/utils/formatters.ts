export function formatCompactRounded(value: number): string {
  const rounded = Math.round(value);
  const absValue = Math.abs(rounded);

  if (absValue < 1_000) {
    return `${rounded}`;
  }

  if (absValue < 10_000) {
    return `${(rounded / 1_000).toFixed(1)}k`;
  }

  if (absValue < 1_000_000) {
    return `${Math.round(rounded / 1_000)}k`;
  }

  if (absValue < 10_000_000) {
    return `${(rounded / 1_000_000).toFixed(1)}m`;
  }

  return `${Math.round(rounded / 1_000_000)}m`;
}

export type FormatUnit = "money" | "number" | "percentage";

export function formatValue(value: number, unit: FormatUnit): string {
  if (unit === "percentage") {
    return `${Math.round(value)}%`;
  }

  const compactValue = formatCompactRounded(value);

  if (unit === "money") {
    return `$${compactValue}`;
  }

  return compactValue;
}
