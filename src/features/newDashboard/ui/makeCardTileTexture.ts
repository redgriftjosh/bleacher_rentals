/** Creates a texture for one grid cell: a rounded card at (0,0) with gap on the right/bottom */

import { Texture } from "pixi.js";

export function makeCardTileTexture(
  w: number,
  h: number,
  r: number,
  gapX: number,
  gapY: number,
  fill: string | number,
  stroke: string | number,
  dpr: number
) {
  const cellW = w + gapX;
  const cellH = h + gapY;
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(cellW * dpr));
  c.height = Math.max(2, Math.round(cellH * dpr));
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // draw the card at top-left (0,0). The extra space to the right/bottom is the gap.
  // fill
  const rr = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  ctx.beginPath();
  ctx.moveTo(rr, 0);
  ctx.arcTo(w, 0, w, h, rr);
  ctx.arcTo(w, h, 0, h, rr);
  ctx.arcTo(0, h, 0, 0, rr);
  ctx.arcTo(0, 0, w, 0, rr);
  ctx.closePath();
  ctx.fillStyle = typeof fill === "number" ? `#${fill.toString(16).padStart(6, "0")}` : fill;
  ctx.fill();

  // border
  ctx.strokeStyle =
    typeof stroke === "number" ? `#${stroke.toString(16).padStart(6, "0")}` : stroke;
  ctx.lineWidth = 2; // 2 CSS px border
  ctx.lineJoin = "round";
  ctx.stroke();

  const tex = Texture.from(c);
  tex.source.resolution = dpr; // tell Pixi this texture is DPR-scaled
  return { tex, cellW, cellH };
}
