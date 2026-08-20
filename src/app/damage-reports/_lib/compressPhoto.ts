"use client";

import {
  REENCODE_QUALITY,
  computeScaledSize,
  extensionForType,
  hasAlphaPixels,
  isHeicHeader,
  pickOutputType,
  shouldUseReencoded,
  withExtension,
  type OutputType,
  type PhotoSize,
} from "./photoCompression";

export type OptimizedPhoto = {
  /** The file to upload — the original one whenever optimisation was skipped. */
  file: File;
  /** True when `file` is a re-encoded copy rather than the untouched original. */
  changed: boolean;
};

/** Formats that can carry an alpha channel and therefore need a transparency probe. */
const ALPHA_CAPABLE_TYPES = ["image/png", "image/webp", ""];

async function readHeader(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, 12).arrayBuffer());
}

/**
 * True for a HEIC/HEIF file, sniffed from the header rather than from
 * `file.type` — browsers routinely hand us an empty type for HEIC, so the
 * MIME string alone would misclassify exactly the files iPhones produce.
 */
export async function isHeicFile(file: File): Promise<boolean> {
  try {
    return isHeicHeader(await readHeader(file));
  } catch {
    return false;
  }
}

async function decodeToBitmap(file: File, heic: boolean): Promise<ImageBitmap> {
  const options: ImageBitmapOptions = { imageOrientation: "from-image" };

  if (!heic) return createImageBitmap(file, options);

  try {
    // Safari decodes HEIC natively, so try that before pulling in the ~3MB
    // wasm decoder chunk.
    return await createImageBitmap(file, options);
  } catch {
    const { heicTo } = await import("heic-to/next");
    return await heicTo({ blob: file, type: "bitmap", options });
  }
}

function drawToCanvas(bitmap: ImageBitmap, size: PhotoSize): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas context unavailable");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);

  return canvas;
}

function canvasHasAlpha(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  return hasAlphaPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
}

function encode(canvas: HTMLCanvasElement, type: OutputType): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, REENCODE_QUALITY));
}

/**
 * Shrinks a damage photo to at most 1920x1080 (1080x1920 for portrait) and
 * re-encodes it before upload.
 *
 * Deliberately conservative — the original file is returned untouched when the
 * photo already fits the box (so a small or already-degraded shot is never
 * upscaled or re-encoded in place) and whenever anything at all goes wrong. A
 * failed optimisation must never cost the user their photo, so every error path
 * degrades to "upload what the user picked", which is the pre-optimisation
 * behaviour.
 *
 * HEIC is the one format converted even when it is already small enough:
 * Chrome and Firefox cannot render it in the report's photo gallery.
 */
export async function optimizeDamagePhoto(file: File): Promise<OptimizedPhoto> {
  const unchanged: OptimizedPhoto = { file, changed: false };

  try {
    const heic = await isHeicFile(file);
    const bitmap = await decodeToBitmap(file, heic);

    try {
      const scaled = computeScaledSize({ width: bitmap.width, height: bitmap.height });

      // Already small enough and in a format browsers can show: leave it alone.
      if (!scaled && !heic) return unchanged;

      const size = scaled ?? { width: bitmap.width, height: bitmap.height };
      const canvas = drawToCanvas(bitmap, size);

      const alpha =
        !heic && ALPHA_CAPABLE_TYPES.includes(file.type) ? canvasHasAlpha(canvas) : false;
      const outputType = pickOutputType(file.type, alpha);

      const blob = await encode(canvas, outputType);
      if (!blob) return unchanged;

      const keep = shouldUseReencoded({ resized: scaled !== null, mustConvert: heic });
      if (!keep) return unchanged;

      const name = withExtension(file.name, extensionForType(outputType));
      return {
        file: new File([blob], name, { type: outputType, lastModified: file.lastModified }),
        changed: true,
      };
    } finally {
      bitmap.close();
    }
  } catch {
    return unchanged;
  }
}
