import { Container, Graphics } from "pixi.js";

/**
 * Draws a red warning border + diagonal stripes overlay to indicate the
 * assigned driver is marked as unavailable on this date.
 */
export function drawUnavailableOverlay(parent: Container, w: number, h: number) {
  const g = new Graphics();

  // Red border
  g.rect(0.5, 0.5, w - 1, h - 1).stroke({ width: 2, color: 0xdc2626, alpha: 0.9 });

  // Diagonal stripes (top-left to bottom-right, 45°)
  // Each line satisfies x - y = offset, so y = x - offset.
  const step = 8;
  g.setStrokeStyle({ width: 1, color: 0xdc2626, alpha: 0.3 });
  for (let offset = -h; offset < w; offset += step) {
    const x1 = Math.max(0, offset);
    const y1 = Math.max(0, -offset);
    const x2 = Math.min(w, offset + h);
    const y2 = x2 - offset;
    g.moveTo(x1, y1).lineTo(x2, y2);
  }
  g.stroke();

  parent.addChild(g);
}
