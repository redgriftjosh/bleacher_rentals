import { Container, Graphics } from "pixi.js";

export type OverlaySeverity = "major" | "minor" | "none";

/**
 * Draws a warning border + diagonal stripes overlay.
 * Red for major damage / unavailable, yellow for minor or no damage.
 */
export function drawUnavailableOverlay(
  parent: Container,
  w: number,
  h: number,
  severity: OverlaySeverity = "none",
) {
  const g = new Graphics();

  const color = severity === "major" ? 0xdc2626 : 0xeab308;

  g.rect(0.5, 0.5, w - 1, h - 1).stroke({ width: 2, color, alpha: 0.9 });

  const step = 8;
  g.setStrokeStyle({ width: 1, color, alpha: 0.3 });
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
