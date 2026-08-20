import { describe, it, expect } from "vitest";
import {
  MAX_LONG_EDGE,
  MAX_SHORT_EDGE,
  computeScaledSize,
  hasAlphaPixels,
  pickOutputType,
  shouldUseReencoded,
  extensionForType,
  withExtension,
  isHeicHeader,
} from "./photoCompression";

const header = (brand: string) => {
  const bytes = new Uint8Array(12);
  bytes.set(new TextEncoder().encode("ftyp"), 4);
  bytes.set(new TextEncoder().encode(brand), 8);
  return bytes;
};

describe("computeScaledSize", () => {
  it("returns null for an image already inside the 1920x1080 box", () => {
    expect(computeScaledSize({ width: 1920, height: 1080 })).toBeNull();
    expect(computeScaledSize({ width: 1080, height: 1920 })).toBeNull();
    expect(computeScaledSize({ width: 800, height: 600 })).toBeNull();
  });

  it("never upscales a small, low-quality photo", () => {
    expect(computeScaledSize({ width: 320, height: 240 })).toBeNull();
    expect(computeScaledSize({ width: 64, height: 64 })).toBeNull();
  });

  it("fits a landscape photo inside the box, preserving the aspect ratio", () => {
    expect(computeScaledSize({ width: 4032, height: 3024 })).toEqual({
      width: 1440,
      height: 1080,
    });
  });

  it("applies the same box to portrait photos (long edge 1920, short edge 1080)", () => {
    expect(computeScaledSize({ width: 3024, height: 4032 })).toEqual({
      width: 1080,
      height: 1440,
    });
  });

  it("caps the long edge on a panorama rather than only the short edge", () => {
    const scaled = computeScaledSize({ width: 8000, height: 1000 });
    expect(scaled).not.toBeNull();
    expect(scaled!.width).toBe(MAX_LONG_EDGE);
    expect(scaled!.height).toBe(240);
  });

  it("shrinks a square photo to the short edge", () => {
    expect(computeScaledSize({ width: 3000, height: 3000 })).toEqual({
      width: MAX_SHORT_EDGE,
      height: MAX_SHORT_EDGE,
    });
  });

  it("clamps a degenerate dimension to 1px instead of rounding it to zero", () => {
    expect(computeScaledSize({ width: 8000, height: 1 })).toEqual({ width: 1920, height: 1 });
  });

  it("treats non-finite or zero dimensions as 'nothing to do'", () => {
    expect(computeScaledSize({ width: 0, height: 0 })).toBeNull();
    expect(computeScaledSize({ width: Number.NaN, height: 100 })).toBeNull();
  });
});

describe("hasAlphaPixels", () => {
  it("is false when every pixel is fully opaque", () => {
    expect(hasAlphaPixels(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]))).toBe(false);
  });

  it("is true as soon as one pixel is not fully opaque", () => {
    expect(hasAlphaPixels(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 254]))).toBe(true);
  });

  it("is false for an empty buffer", () => {
    expect(hasAlphaPixels(new Uint8ClampedArray())).toBe(false);
  });
});

describe("pickOutputType", () => {
  it("re-encodes opaque photos as JPEG regardless of the source format", () => {
    expect(pickOutputType("image/png", false)).toBe("image/jpeg");
    expect(pickOutputType("image/heic", false)).toBe("image/jpeg");
    expect(pickOutputType("image/webp", false)).toBe("image/jpeg");
    expect(pickOutputType("", false)).toBe("image/jpeg");
  });

  it("keeps a lossless format when the image carries transparency", () => {
    expect(pickOutputType("image/png", true)).toBe("image/png");
    expect(pickOutputType("image/webp", true)).toBe("image/webp");
  });
});

describe("shouldUseReencoded", () => {
  it("takes the re-encoded file whenever the photo was actually downscaled", () => {
    expect(shouldUseReencoded({ resized: true })).toBe(true);
  });

  it("takes the re-encoded file for a format that must be converted (HEIC)", () => {
    expect(shouldUseReencoded({ resized: false, mustConvert: true })).toBe(true);
  });

  it("keeps the original when nothing was resized and nothing must be converted", () => {
    expect(shouldUseReencoded({ resized: false })).toBe(false);
  });
});

describe("extensionForType / withExtension", () => {
  it("maps output MIME types to their canonical extension", () => {
    expect(extensionForType("image/jpeg")).toBe("jpg");
    expect(extensionForType("image/png")).toBe("png");
    expect(extensionForType("image/webp")).toBe("webp");
  });

  it("rewrites the extension so a converted HEIC is not stored as .heic", () => {
    expect(withExtension("IMG_0042.HEIC", "jpg")).toBe("IMG_0042.jpg");
    expect(withExtension("photo.png", "jpg")).toBe("photo.jpg");
  });

  it("appends an extension when the filename has none", () => {
    expect(withExtension("photo", "jpg")).toBe("photo.jpg");
  });

  it("replaces only the final extension segment", () => {
    expect(withExtension("my.photo.set", "jpg")).toBe("my.photo.jpg");
  });
});

describe("isHeicHeader", () => {
  it("recognises the HEIF/HEIC brands iOS produces", () => {
    for (const brand of ["heic", "heix", "mif1", "msf1", "hevc", "hevx"]) {
      expect(isHeicHeader(header(brand))).toBe(true);
    }
  });

  it("rejects a JPEG header", () => {
    expect(isHeicHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      false,
    );
  });

  it("rejects an MP4 (ftyp, but not a HEIF brand)", () => {
    expect(isHeicHeader(header("isom"))).toBe(false);
  });

  it("rejects a truncated header instead of throwing", () => {
    expect(isHeicHeader(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});
