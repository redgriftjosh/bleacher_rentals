"use client";

import { useAddressTooltipStore } from "../state/useAddressTooltipStore";

const TOOLTIP_OFFSET = 12;
const RIGHT_EDGE_THRESHOLD = 300;

export function AddressTooltip() {
  const text = useAddressTooltipStore((s) => s.text);
  const x = useAddressTooltipStore((s) => s.x);
  const y = useAddressTooltipStore((s) => s.y);

  if (!text) return null;

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
      {text}
    </div>
  );
}
