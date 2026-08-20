/**
 * Pure sizing/format decisions behind damage-photo optimisation.
 *
 * Kept free of DOM/canvas APIs so it runs under the node-environment Vitest
 * suite; the browser-side pipeline that consumes it lives in compressPhoto.ts.
 */

/** Longest edge a stored damage photo may have. */
export const MAX_LONG_EDGE = 1920;

/** Shortest edge a stored damage photo may have. */
export const MAX_SHORT_EDGE = 1080;

/** JPEG/WebP quality used when re-encoding. */
export const REENCODE_QUALITY = 0.85;

export type PhotoSize = { width: number; height: number };

export type OutputType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Fits a photo inside the 1920x1080 box in whichever orientation it was shot,
 * so a portrait phone photo is capped at 1080x1920 and a landscape one at
 * 1920x1080.
 *
 * Returns null when the photo already fits — the caller then keeps the original
 * bytes untouched. That is the "don't touch a low-quality photo" rule: we only
 * ever shrink, never upscale, so a small or already-degraded photo passes
 * through byte-for-byte.
 */
export function computeScaledSize({ width, height }: PhotoSize): PhotoSize | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const scale = Math.min(MAX_LONG_EDGE / longEdge, MAX_SHORT_EDGE / shortEdge);

  if (scale >= 1) return null;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** True if any pixel in an RGBA buffer is less than fully opaque. */
export function hasAlphaPixels(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Opaque photos become JPEG — that is the whole point of the optimisation, and
 * it also gets HEIC out of a format most browsers cannot render in an <img>.
 * Transparency is the one thing JPEG cannot carry, so a source with an alpha
 * channel stays in a lossless-alpha format instead.
 */
export function pickOutputType(sourceType: string, hasAlpha: boolean): OutputType {
  if (!hasAlpha) return "image/jpeg";
  return sourceType === "image/webp" ? "image/webp" : "image/png";
}

/**
 * Whether the re-encoded copy replaces the original.
 *
 * Deliberately decided on pixels, not bytes. An earlier version kept the
 * original whenever re-encoding grew the file, but that let a 4032x3024 image
 * stay at full resolution just because it happened to compress well as PNG —
 * defeating the point, since an oversized image also costs decode memory in
 * the report gallery, not just storage. "Don't touch a poor-quality photo" is
 * enforced upstream instead, by computeScaledSize returning null for anything
 * that already fits the box (we only ever shrink, never upscale or re-encode
 * in place).
 *
 * `mustConvert` covers HEIC, which is converted even when it grows: HEIC beats
 * any JPEG we can produce on size, but Chrome and Firefox cannot render it.
 */
export function shouldUseReencoded({
  resized,
  mustConvert = false,
}: {
  resized: boolean;
  mustConvert?: boolean;
}): boolean {
  return resized || mustConvert;
}

export function extensionForType(type: OutputType): string {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

/** Rewrites a filename's extension, so a converted IMG_0042.HEIC is not stored as .heic. */
export function withExtension(fileName: string, extension: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const stem = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  return `${stem}.${extension}`;
}

/**
 * ISO-BMFF brands that mean "this is HEIF/HEIC".
 * Mirrors heic-to's own sniffing so we can decide whether the ~3MB decoder
 * chunk is worth loading *before* importing it.
 */
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

/**
 * Detects HEIC from the first 12 bytes of the file rather than from
 * `file.type`, which browsers frequently report as "" for HEIC.
 */
export function isHeicHeader(header: Uint8Array): boolean {
  if (header.length < 12) return false;

  const decoder = new TextDecoder("utf-8");
  if (decoder.decode(header.slice(4, 8)) !== "ftyp") return false;

  const brand = decoder.decode(header.slice(8, 12)).replace("\0", " ").trim();
  return HEIF_BRANDS.has(brand);
}
