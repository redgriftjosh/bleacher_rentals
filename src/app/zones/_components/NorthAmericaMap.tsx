"use client";

import React, { useState, useCallback, memo, forwardRef, useEffect, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  createCoordinates,
} from "@vnedyalk0v/react19-simple-maps";
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

/**
 * Read the `data-region` attribute from the SVG element under the cursor.
 * Checks the target itself first, then walks up to find a parent with the attr.
 */
function regionFromTarget(el: Element | null): string | null {
  if (!el) return null;
  const direct = el.getAttribute("data-region");
  if (direct) return direct;
  const parent = el.closest("[data-region]");
  return parent?.getAttribute("data-region") ?? null;
}

export const NorthAmericaMap = memo(
  forwardRef<HTMLDivElement, NorthAmericaMapProps>(function NorthAmericaMap(
    { selectedRegions, onToggleRegion, unavailableRegions = new Set() },
    ref,
  ) {
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [tooltipContent, setTooltipContent] = useState("");
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    /** Ref mirrors hoveredRegion to avoid stale closures in mousemove */
    const hoveredRef = useRef<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [usGeoData, setUsGeoData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [caGeoData, setCaGeoData] = useState<any>(null);

    useEffect(() => {
      fetch(US_GEO_URL)
        .then((r) => r.json())
        .then(setUsGeoData);
      fetch(CA_GEO_URL)
        .then((r) => r.json())
        .then(setCaGeoData);
    }, []);

    const handleClick = useCallback(
      (abbrev: string | null) => {
        if (!abbrev || unavailableRegions.has(abbrev)) return;
        onToggleRegion(abbrev);
      },
      [onToggleRegion, unavailableRegions],
    );

    /* ── Event delegation ──────────────────────────────────────────────
     * Instead of per-Geography onMouseEnter / onMouseLeave (which race
     * when moving between adjacent <path> elements), we use a SINGLE
     * onMouseMove on the container and read `data-region` from the
     * element under the cursor.  One handler → zero race conditions.
     * ─────────────────────────────────────────────────────────────── */

    const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
      // Tooltip position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 12,
      });

      // Detect which region the cursor is over
      const region = regionFromTarget(e.target as Element);

      if (region !== hoveredRef.current) {
        hoveredRef.current = region;
        setHoveredRegion(region);
        setTooltipContent(region ? (ABBREV_TO_NAME[region] ?? region) : "");
      }
    }, []);

    const handleContainerMouseLeave = useCallback(() => {
      hoveredRef.current = null;
      setHoveredRegion(null);
      setTooltipContent("");
    }, []);

    /** Container-level click as backup (also fires per-Geography) */
    const handleContainerClick = useCallback(
      (e: React.MouseEvent) => {
        const region = regionFromTarget(e.target as Element);
        if (region && !unavailableRegions.has(region)) {
          onToggleRegion(region);
        }
      },
      [onToggleRegion, unavailableRegions],
    );

    const renderGeographies = useCallback(
      (source: "us" | "ca") =>
        ({
          geographies,
        }: {
          geographies: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
        }) =>
          geographies.map((geo, i) => {
            const abbrev = getAbbrev(geo, source);
            if (source === "us" && !abbrev) return null;
            const key = geo.rsmKey ?? geo.id ?? geo.properties?.name ?? `${source}-${i}`;
            const isUnavailable = !!abbrev && unavailableRegions.has(abbrev);
            const sharedStyle = {
              outline: "none",
              transition: "fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease",
              pointerEvents: "all" as const,
              cursor: abbrev && !isUnavailable ? "pointer" : ("not-allowed" as const),
            };
            return (
              <Geography
                key={key}
                geography={geo}
                data-region={abbrev ?? undefined}
                fill={getFill(abbrev, hoveredRegion, selectedRegions, unavailableRegions)}
                stroke={getStroke(abbrev, hoveredRegion, selectedRegions, unavailableRegions)}
                strokeWidth={getStrokeWidth(abbrev, hoveredRegion, selectedRegions)}
                tabIndex={-1}
                style={{
                  default: sharedStyle,
                  hover: sharedStyle,
                  pressed: sharedStyle,
                }}
              />
            );
          }),
      [hoveredRegion, selectedRegions, unavailableRegions],
    );

    return (
      <div
        ref={ref}
        className="relative w-full map-container"
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        onClick={handleContainerClick}
      >
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
            rotate: [95, 0, 0] as any,
            center: createCoordinates(0, 46),
            scale: 700,
          }}
          className="w-full h-auto border border-gray-300 rounded-lg bg-sky-50"
          width={800}
          height={520}
        >
          {/* Canada provinces */}
          {caGeoData && (
            <Geographies geography={caGeoData as any}>{renderGeographies("ca")}</Geographies>
          )}

          {/* US states */}
          {usGeoData && (
            <Geographies geography={usGeoData as any}>{renderGeographies("us")}</Geographies>
          )}
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
