import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { optimizeDamagePhoto, isHeicFile } from "./compressPhoto";

/** Bytes that sniff as HEIC: "....ftyp<brand>". */
const heicBytes = (brand = "heic", padding = 0) => {
  const bytes = new Uint8Array(12 + padding);
  bytes.set(new TextEncoder().encode("ftyp"), 4);
  bytes.set(new TextEncoder().encode(brand), 8);
  return bytes;
};

const jpegBytes = (size: number) => {
  const bytes = new Uint8Array(Math.max(12, size));
  bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return bytes;
};

const fileOf = (bytes: Uint8Array, name: string, type: string) => new File([bytes], name, { type });

/** Stands in for the decoded image; only the dimensions matter here. */
const stubBitmap = (width: number, height: number) => {
  const close = vi.fn();
  return { bitmap: { width, height, close } as unknown as ImageBitmap, close };
};

type CanvasStub = { width: number; height: number };

/**
 * Installs fake createImageBitmap/document.createElement so the pipeline can be
 * exercised under the node-environment Vitest suite.
 */
function installBrowserStubs(opts: {
  bitmap?: ImageBitmap;
  decodeError?: Error;
  encodedBytes?: number;
  alpha?: boolean;
}) {
  const canvases: CanvasStub[] = [];

  const createImageBitmap = vi.fn(async () => {
    if (opts.decodeError) throw opts.decodeError;
    return opts.bitmap!;
  });

  const createElement = vi.fn(() => {
    const canvas: CanvasStub = { width: 0, height: 0 };
    canvases.push(canvas);
    return {
      get width() {
        return canvas.width;
      },
      set width(v: number) {
        canvas.width = v;
      },
      get height() {
        return canvas.height;
      },
      set height(v: number) {
        canvas.height = v;
      },
      getContext: () => ({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
        drawImage: vi.fn(),
        getImageData: () => ({
          data: new Uint8ClampedArray([0, 0, 0, opts.alpha ? 128 : 255]),
        }),
      }),
      toBlob: (cb: (blob: Blob | null) => void, type: string) => {
        cb(new Blob([new Uint8Array(opts.encodedBytes ?? 1000)], { type }));
      },
    };
  });

  vi.stubGlobal("createImageBitmap", createImageBitmap);
  vi.stubGlobal("document", { createElement });

  return { canvases, createImageBitmap };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isHeicFile", () => {
  it("detects HEIC from the header even when the browser reports no MIME type", async () => {
    expect(await isHeicFile(fileOf(heicBytes(), "IMG_0042.HEIC", ""))).toBe(true);
  });

  it("is false for a JPEG", async () => {
    expect(await isHeicFile(fileOf(jpegBytes(64), "photo.jpg", "image/jpeg"))).toBe(false);
  });
});

describe("optimizeDamagePhoto", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a within-limits JPEG untouched, without ever touching a canvas", async () => {
    const { bitmap, close } = stubBitmap(1600, 900);
    const { canvases } = installBrowserStubs({ bitmap });
    const original = fileOf(jpegBytes(5000), "photo.jpg", "image/jpeg");

    const result = await optimizeDamagePhoto(original);

    expect(result.changed).toBe(false);
    expect(result.file).toBe(original);
    expect(canvases).toHaveLength(0);
    expect(close).toHaveBeenCalled();
  });

  it("downscales an oversized JPEG into the 1920x1080 box", async () => {
    const { bitmap } = stubBitmap(4032, 3024);
    const { canvases } = installBrowserStubs({ bitmap, encodedBytes: 800 });
    const original = fileOf(jpegBytes(50_000), "photo.jpg", "image/jpeg");

    const result = await optimizeDamagePhoto(original);

    expect(result.changed).toBe(true);
    expect(canvases[0]).toEqual({ width: 1440, height: 1080 });
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.size).toBe(800);
  });

  it("still downscales an oversized photo that happens to re-encode larger", () => {
    // Byte size must not veto the resize: a 4032x3024 image costs decode memory
    // in the gallery even when it compresses well.
    const { bitmap } = stubBitmap(4032, 3024);
    const { canvases } = installBrowserStubs({ bitmap, encodedBytes: 90_000 });
    const original = fileOf(jpegBytes(50_000), "grainy.jpg", "image/jpeg");

    return optimizeDamagePhoto(original).then((result) => {
      expect(result.changed).toBe(true);
      expect(canvases[0]).toEqual({ width: 1440, height: 1080 });
    });
  });

  it("converts a small HEIC to JPEG anyway, since browsers cannot render HEIC", async () => {
    const { bitmap } = stubBitmap(1200, 900);
    const { canvases } = installBrowserStubs({ bitmap, encodedBytes: 400_000 });
    const original = fileOf(heicBytes("heic", 5000), "IMG_0042.HEIC", "");

    const result = await optimizeDamagePhoto(original);

    expect(result.changed).toBe(true);
    expect(result.file.name).toBe("IMG_0042.jpg");
    expect(result.file.type).toBe("image/jpeg");
    // Not resized — only transcoded.
    expect(canvases[0]).toEqual({ width: 1200, height: 900 });
  });

  it("keeps PNG output when the source is transparent", async () => {
    const { bitmap } = stubBitmap(4000, 4000);
    installBrowserStubs({ bitmap, encodedBytes: 900, alpha: true });
    const original = fileOf(jpegBytes(50_000), "overlay.png", "image/png");

    const result = await optimizeDamagePhoto(original);

    expect(result.file.type).toBe("image/png");
    expect(result.file.name).toBe("overlay.png");
  });

  it("falls back to the original file when decoding fails", async () => {
    installBrowserStubs({ decodeError: new Error("unsupported") });
    const original = fileOf(jpegBytes(50_000), "broken.jpg", "image/jpeg");

    const result = await optimizeDamagePhoto(original);

    expect(result.changed).toBe(false);
    expect(result.file).toBe(original);
  });
});
