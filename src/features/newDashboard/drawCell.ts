import { hash2 } from "./hash";

/**
 * Draws ONE cell's content into a 2D canvas context.
 * - x,y,w,h = pixel rect of the cell within the chunk canvas
 * - cellX,cellY = WORLD indices of the cell (deterministic seed)
 * - heavyMode = if true, draw more shapes per cell to increase CPU cost
 *
 * Keep this pure (no external state): it lets us run it in a Worker, or unit-test.
 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cellX: number,
  cellY: number,
  heavyMode: boolean
) {
  const hval = hash2(cellX, cellY);

  // Background (very light variation)
  if ((hval & 3) === 0) {
    ctx.fillStyle = "#f7f7f7";
  } else {
    ctx.fillStyle = "#ffffff";
  }
  ctx.fillRect(x, y, w, h);

  // Subtle grid edges (right & bottom lines)
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w - 0.5, y);
  ctx.lineTo(x + w - 0.5, y + h);
  ctx.moveTo(x, y + h - 0.5);
  ctx.lineTo(x + w, y + h - 0.5);
  ctx.stroke();

  // Shapes: crank this up in heavy mode
  const shapes = heavyMode ? 3 : 1;
  for (let i = 0; i < shapes; i++) {
    // pseudo-randoms from the hash (stable per cell)
    const r1 = ((hval >>> (i * 5)) & 1023) / 1023;
    const r2 = ((hval >>> (i * 9)) & 1023) / 1023;
    const r3 = ((hval >>> (i * 13)) & 1023) / 1023;
    const shape = (hval >>> (i * 3)) % 5; // 0..4

    const px = x + 8 + r1 * (w - 16);
    const py = y + 8 + r2 * (h - 16);
    const size = 10 + r3 * Math.min(w, h) * 0.5;

    // pastel-ish color derived from hash, offset per shape index
    const hue = hval % 360;
    ctx.fillStyle = `hsl(${(hue + i * 37) % 360} 70% 60%)`;

    switch (shape) {
      case 0: {
        // circle
        ctx.beginPath();
        ctx.arc(px, py, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 1: {
        // rectangle
        const rw = size * 0.8,
          rh = size * 0.5;
        ctx.fillRect(px - rw / 2, py - rh / 2, rw, rh);
        break;
      }
      case 2: {
        // diamond
        const s = size * 0.45;
        ctx.beginPath();
        ctx.moveTo(px, py - s);
        ctx.lineTo(px + s, py);
        ctx.lineTo(px, py + s);
        ctx.lineTo(px - s, py);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 3: {
        // triangle
        const s = size * 0.55;
        ctx.beginPath();
        ctx.moveTo(px, py - s);
        ctx.lineTo(px + s, py + s);
        ctx.lineTo(px - s, py + s);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 4: {
        // plus sign
        const s = size * 0.35;
        ctx.fillRect(px - s / 6, py - s, s / 3, 2 * s);
        ctx.fillRect(px - s, py - s / 6, 2 * s, s / 3);
        break;
      }
    }
  }
}
