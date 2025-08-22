// lib/pixi/ui/roundedRectNineSlice.ts (Pixi v8)
import { Texture, NineSliceSprite } from "pixi.js";

type Opts = {
  width: number;
  height: number;
  radius: number;
  border: number;
  fill?: number;
  stroke?: number;
  alpha?: number;
};

const cache = new Map<string, { fillTex: Texture; borderTex: Texture }>();

export function createRoundedRectNineSlice(opts: Opts) {
  const { width, height, radius, border, fill = 0xffffff, stroke = 0x222222, alpha = 1 } = opts;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = `${radius}|${border}|${dpr}`;

  let entry = cache.get(key);
  if (!entry) {
    const texSize = Math.max(2, 2 * (radius + border));

    const makeCanvas = () => {
      const c = document.createElement("canvas");
      c.width = Math.max(2, Math.round(texSize * dpr));
      c.height = Math.max(2, Math.round(texSize * dpr));
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      return { c, ctx };
    };
    const rr = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const R = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
      ctx.beginPath();
      ctx.moveTo(x + R, y);
      ctx.arcTo(x + w, y, x + w, y + h, R);
      ctx.arcTo(x + w, y + h, x, y + h, R);
      ctx.arcTo(x, y + h, x, y, R);
      ctx.arcTo(x, y, x + w, y, R);
      ctx.closePath();
    };

    // FILL texture (white rounded rect)
    {
      const { c, ctx } = makeCanvas();
      ctx.fillStyle = "#fff";
      rr(ctx, 0, 0, texSize, texSize, radius);
      ctx.fill();
      var fillTex = Texture.from(c);
      fillTex.source.resolution = dpr; // v8 options form
    }

    // BORDER texture (white ring with transparent center)
    {
      const { c, ctx } = makeCanvas();
      ctx.fillStyle = "#fff";
      rr(ctx, 0, 0, texSize, texSize, radius);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      const innerR = Math.max(0, radius - border);
      rr(ctx, border, border, texSize - 2 * border, texSize - 2 * border, innerR);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      var borderTex = Texture.from(c);
      borderTex.source.resolution = dpr;
    }

    entry = { fillTex, borderTex };
    cache.set(key, entry);
  }

  const margin = Math.max(1, Math.round(radius + border));

  const fillSprite = new NineSliceSprite({
    texture: entry!.fillTex,
    leftWidth: margin,
    topHeight: margin,
    rightWidth: margin,
    bottomHeight: margin,
    width,
    height,
  });
  fillSprite.tint = fill;
  fillSprite.alpha = alpha;

  const borderSprite = new NineSliceSprite({
    texture: entry!.borderTex,
    leftWidth: margin,
    topHeight: margin,
    rightWidth: margin,
    bottomHeight: margin,
    width,
    height,
  });
  borderSprite.tint = stroke;
  borderSprite.alpha = alpha;

  return { fillSprite, borderSprite };
}
