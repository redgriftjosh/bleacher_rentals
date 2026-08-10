"use client";

const TOOLTIP_OFFSET = 12;
const RIGHT_EDGE_THRESHOLD = 300;

/**
 * Presentational shell for dashboard hover tooltips: a fixed, pointer-transparent
 * box positioned near the cursor that flips to the left when close to the right edge.
 * Shared by the address and distance tooltips so positioning stays in one place.
 */
export function TooltipBox({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  const nearRightEdge =
    typeof window !== "undefined" && x > window.innerWidth - RIGHT_EDGE_THRESHOLD;

  const style: React.CSSProperties = nearRightEdge
    ? { right: window.innerWidth - x + TOOLTIP_OFFSET, top: y + TOOLTIP_OFFSET }
    : { left: x + TOOLTIP_OFFSET, top: y + TOOLTIP_OFFSET };

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
      style={style}
    >
      {children}
    </div>
  );
}
