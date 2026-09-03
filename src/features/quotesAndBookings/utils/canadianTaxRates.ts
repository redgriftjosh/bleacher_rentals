/**
 * Canadian sales tax rates by province, as a single combined percentage.
 *
 * Unlike the US, Canada has no address-level tax lookup available through the
 * QuickBooks API. QBO Canada files have no Automated Sales Tax engine — they
 * apply whichever tax code you hand them, so an Estimate cannot be used to
 * *discover* a rate the way it is for US addresses. Rates are instead flat per
 * province and change rarely, so a static table is the correct source.
 *
 * Tax follows place of supply: the province the goods are delivered to, not
 * where the sales office is.
 *
 * Quebec is the combined GST 5% + QST 9.975%. QST has not been compounded on
 * top of GST since 2013, so the two add to a single 14.975% of the pre-tax
 * amount. If a quote ever has to itemize GST and QST as separate lines, this
 * single-number model is what has to change.
 *
 * Rates verified against CRA/Revenu Québec as of 2026-09-02. Nova Scotia
 * dropped from 15% to 14% on 2025-04-01.
 */

type ProvinceCode =
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "NS"
  | "NT"
  | "NU"
  | "ON"
  | "PE"
  | "QC"
  | "SK"
  | "YT";

type ProvinceInfo = {
  name: string;
  /** Combined federal + provincial rate applied to the pre-tax amount. */
  taxPercent: number;
  /** How the rate is made up, for display and for future itemization. */
  label: string;
};

export const CANADIAN_PROVINCES: Record<ProvinceCode, ProvinceInfo> = {
  AB: { name: "Alberta", taxPercent: 5, label: "GST 5%" },
  BC: { name: "British Columbia", taxPercent: 12, label: "GST 5% + PST 7%" },
  MB: { name: "Manitoba", taxPercent: 12, label: "GST 5% + PST 7%" },
  NB: { name: "New Brunswick", taxPercent: 15, label: "HST 15%" },
  NL: { name: "Newfoundland and Labrador", taxPercent: 15, label: "HST 15%" },
  NS: { name: "Nova Scotia", taxPercent: 14, label: "HST 14%" },
  NT: { name: "Northwest Territories", taxPercent: 5, label: "GST 5%" },
  NU: { name: "Nunavut", taxPercent: 5, label: "GST 5%" },
  ON: { name: "Ontario", taxPercent: 13, label: "HST 13%" },
  PE: { name: "Prince Edward Island", taxPercent: 15, label: "HST 15%" },
  QC: { name: "Quebec", taxPercent: 14.975, label: "GST 5% + QST 9.975%" },
  SK: { name: "Saskatchewan", taxPercent: 11, label: "GST 5% + PST 6%" },
  YT: { name: "Yukon", taxPercent: 5, label: "GST 5%" },
};

/** Alternate spellings that Google Places and QBO return for some provinces. */
const NAME_ALIASES: Record<string, ProvinceCode> = {
  québec: "QC",
  "newfoundland & labrador": "NL",
  newfoundland: "NL",
  "p.e.i.": "PE",
  pei: "PE",
};

/**
 * Resolves a province code or name to its two-letter code, or null if it is not
 * Canadian. Accepts what address autocomplete actually produces — "ON",
 * "Ontario", "ontario" — since the event address stores a free-form string.
 */
export function normalizeCanadianProvince(
  stateProvince: string | null | undefined,
): ProvinceCode | null {
  if (!stateProvince) return null;
  const trimmed = stateProvince.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper in CANADIAN_PROVINCES) return upper as ProvinceCode;

  const lower = trimmed.toLowerCase();
  if (lower in NAME_ALIASES) return NAME_ALIASES[lower];

  const byName = (Object.keys(CANADIAN_PROVINCES) as ProvinceCode[]).find(
    (code) => CANADIAN_PROVINCES[code].name.toLowerCase() === lower,
  );
  return byName ?? null;
}

/** True when the province belongs to Canada. */
export function isCanadianProvince(stateProvince: string | null | undefined): boolean {
  return normalizeCanadianProvince(stateProvince) !== null;
}

/**
 * Combined tax percentage for a Canadian province, or null when the province is
 * not Canadian (or is blank). Null means "this is not the Canadian case" — the
 * caller should fall through to the US lookup, not treat it as 0%.
 */
export function getCanadianTaxPercent(stateProvince: string | null | undefined): number | null {
  const code = normalizeCanadianProvince(stateProvince);
  return code === null ? null : CANADIAN_PROVINCES[code].taxPercent;
}

/** Human-readable breakdown, e.g. "GST 5% + QST 9.975%". Null when not Canadian. */
export function getCanadianTaxLabel(stateProvince: string | null | undefined): string | null {
  const code = normalizeCanadianProvince(stateProvince);
  return code === null ? null : CANADIAN_PROVINCES[code].label;
}
