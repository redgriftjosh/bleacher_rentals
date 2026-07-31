"use client";

import { useQuery } from "@tanstack/react-query";
import { useTooltipStore } from "../state/useTooltipStore";
import { TooltipBox } from "./TooltipBox";

type DistanceResponse = {
  distanceMeters: number | null;
  distanceText: string | null;
};

/**
 * Renders the single active dashboard hover tooltip. Which kind is active is driven
 * imperatively from the Pixi layer via useTooltipStore. The distance value is fetched
 * lazily here (react-query, cache shared with WorkTrackerModal under "gmaps-distance").
 */
export function DashboardTooltip() {
  const content = useTooltipStore((s) => s.content);
  const x = useTooltipStore((s) => s.x);
  const y = useTooltipStore((s) => s.y);

  const isDistance = content?.kind === "distance";
  const origin = isDistance ? content.origin : "";
  const dest = isDistance ? content.dest : "";

  const { data, isFetching, isError } = useQuery({
    queryKey: ["gmaps-distance", origin, dest],
    enabled: isDistance && Boolean(origin && dest),
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(
        `/api/distance?origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(dest)}`,
      );
      if (!res.ok) throw new Error(`Distance API failed (${res.status})`);
      return res.json() as Promise<DistanceResponse>;
    },
  });

  if (!content) return null;

  if (content.kind === "address") {
    return (
      <TooltipBox x={x} y={y}>
        {content.text}
      </TooltipBox>
    );
  }

  const distanceText = isError
    ? "Distance unavailable"
    : isFetching || !data
      ? "Calculating…"
      : (data.distanceText ?? "Distance unavailable");

  return (
    <TooltipBox x={x} y={y}>
      {distanceText}
    </TooltipBox>
  );
}
