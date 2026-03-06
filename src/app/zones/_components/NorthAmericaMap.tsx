"use client";

import React, { useState, useCallback, memo, forwardRef } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { FIPS_TO_ABBREV, PROVINCE_NAME_TO_ABBREV, ABBREV_TO_NAME, EXCLUDED_FIPS } from "./mapData";

const US_GEO_URL = "/geo/us-states-10m.json";
const CA_GEO_URL = "/geo/canada-provinces.json";

interface NorthAmericaMapProps {
  selectedRegions: Set<string>;
  onToggleRegion: (regionId: string) => void;
  /** Region IDs already claimed by other zones (shown as unavailable) */
  unavailableRegions?: Set<string>;
}

/** Resolve a Geography feature to its abbreviation, or null if excluded */
function getAbbrev(
  geo: { id?: string; properties?: { name?: string } },
  source: "us" | "ca",
): string | null {
  if (source === "us") {
    const fips = String(geo.id);
    if (EXCLUDED_FIPS.has(fips)) return null;
    return FIPS_TO_ABBREV[fips] ?? null;
  }
  const name = geo.properties?.name ?? "";
  return PROVINCE_NAME_TO_ABBREV[name] ?? null;
}

function getFill(
  abbrev: string | null,
  hovered: string | null,
  selected: Set<string>,
  unavailable: Set<string>,
): string {
  if (!abbrev) return "#f3f4f6";
  if (unavailable.has(abbrev)) return "#d1d5db";
  if (selected.has(abbrev)) return "#22c55e";
  if (hovered === abbrev) return "#86efac";
  return "#e5e7eb";
}

function getStroke(
  abbrev: string | null,
  hovered: string | null,
  selected: Set<string>,
  unavailable: Set<string>,
): string {
  if (!abbrev) return "#d1d5db";
  if (unavailable.has(abbrev)) return "#9ca3af";
  if (selected.has(abbrev)) return "#15803d";
  if (hovered === abbrev) return "#16a34a";
  return "#9ca3af";
}

function getStrokeWidth(
  abbrev: string | null,
  hovered: string | null,
  selected: Set<string>,
): number {
  if (!abbrev) return 0.5;
  if (selected.has(abbrev) || hovered === abbrev) return 1.5;
  return 0.5;
}

export const NorthAmericaMap = memo(
  forwardRef<HTMLDivElement, NorthAmericaMapProps>(function NorthAmericaMap(
    { selectedRegions, onToggleRegion, unavailableRegions = new Set() },
    ref,
  ) {
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [tooltipContent, setTooltipContent] = useState("");
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleClick = useCallback(
      (abbrev: string | null) => {
        if (!abbrev || unavailableRegions.has(abbrev)) return;
        onToggleRegion(abbrev);
      },
      [onToggleRegion, unavailableRegions],
    );

    const handleMouseEnter = useCallback((abbrev: string | null) => {
      if (!abbrev) return;
      setHoveredRegion(abbrev);
      setTooltipContent(ABBREV_TO_NAME[abbrev] ?? abbrev);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setHoveredRegion(null);
      setTooltipContent("");
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      const container = (e.currentTarget as HTMLElement).closest(".map-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 12,
      });
    }, []);

    const renderGeographies = useCallback(
      (source: "us" | "ca") =>
        ({
          geographies,
        }: {
          geographies: Array<{
            rsmKey: string;
            id?: string;
            properties?: { name?: string };
            svgPath?: string;
          }>;
        }) =>
          geographies.map((geo) => {
            const abbrev = getAbbrev(geo, source);
            if (source === "us" && !abbrev) return null;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                data-region={abbrev ?? undefined}
                fill={getFill(abbrev, hoveredRegion, selectedRegions, unavailableRegions)}
                stroke={getStroke(abbrev, hoveredRegion, selectedRegions, unavailableRegions)}
                strokeWidth={getStrokeWidth(abbrev, hoveredRegion, selectedRegions)}
                style={{
                  default: { outline: "none", transition: "fill 0.15s ease" },
                  hover: {
                    outline: "none",
                    cursor: abbrev && !unavailableRegions.has(abbrev) ? "pointer" : "not-allowed",
                  },
                  pressed: { outline: "none" },
                }}
                onMouseEnter={() => handleMouseEnter(abbrev)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(abbrev)}
              />
            );
          }),
      [
        hoveredRegion,
        selectedRegions,
        unavailableRegions,
        handleMouseEnter,
        handleMouseLeave,
        handleClick,
      ],
    );

    return (
      <div ref={ref} className="relative w-full map-container" onMouseMove={handleMouseMove}>
        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="absolute z-10 pointer-events-none px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tooltipContent}
          </div>
        )}

        <ComposableMap
          projection="geoAlbers"
          projectionConfig={{
            rotate: [95, 0, 0],
            center: [0, 46],
            scale: 700,
          }}
          className="w-full h-auto border border-gray-300 rounded-lg bg-sky-50"
          width={800}
          height={520}
        >
          <ZoomableGroup>
            {/* Canada provinces */}
            <Geographies geography={CA_GEO_URL}>{renderGeographies("ca")}</Geographies>

            {/* US states */}
            <Geographies geography={US_GEO_URL}>{renderGeographies("us")}</Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-400" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-700" />
            <span>Selected</span>
          </div>
          {unavailableRegions.size > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-300 border border-gray-400" />
              <span>Assigned to another zone</span>
            </div>
          )}
        </div>
      </div>
    );
  }),
);
