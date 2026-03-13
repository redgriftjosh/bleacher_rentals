"use client";

import React, { useState, useCallback, useRef } from "react";
import { NorthAmericaMap } from "./NorthAmericaMap";
import { ABBREV_TO_NAME, NAME_TO_ABBREV } from "./mapData";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ZoneWithStateProvinces } from "../_lib/types";
import { SelectQboClassSimple } from "@/features/quickbooks-integration/components/SelectQboClassSimple";
import { fetchQboConnections, QboConnection } from "@/features/quickbooks-integration/api";
import { useQuery } from "@tanstack/react-query";

export type ZoneQboClassMapping = {
  connectionId: string;
  classId: string;
};

/** Generate a cropped PNG blob of the selected map regions */
function generateMapBlob(
  svgElement: SVGSVGElement,
  selectedRegions: Set<string>,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // Remove tooltip overlay if present
    svgClone.querySelectorAll("[pointer-events]").forEach((el) => el.remove());

    // Reset ALL <g> transforms to undo ZoomableGroup pan/zoom
    svgClone.querySelectorAll("g[transform]").forEach((g) => {
      g.removeAttribute("transform");
    });

    // Temporarily insert offscreen so getBBox() works
    svgClone.style.position = "absolute";
    svgClone.style.left = "-9999px";
    svgClone.style.top = "-9999px";
    document.body.appendChild(svgClone);

    // Find selected paths in the clone
    const selectedPaths = Array.from(
      svgClone.querySelectorAll<SVGPathElement>("path[data-region]"),
    ).filter((path) => selectedRegions.has(path.getAttribute("data-region")!));

    if (selectedPaths.length === 0) {
      document.body.removeChild(svgClone);
      resolve(null);
      return;
    }

    // Get the union bounding box in SVG coordinate space
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const path of selectedPaths) {
      const bbox = path.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }

    document.body.removeChild(svgClone);

    // Add 5% padding
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const pad = Math.max(bboxW, bboxH) * 0.05;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = bboxW + pad * 2;
    const vbH = bboxH + pad * 2;

    svgClone.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);

    const aspect = vbW / vbH;
    const outputW = Math.min(2400, Math.max(1200, Math.round(vbW * 4)));
    const outputH = Math.round(outputW / aspect);
    svgClone.setAttribute("width", String(outputW));
    svgClone.setAttribute("height", String(outputH));
    svgClone.style.cssText = "";

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f0f9ff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        resolve(pngBlob);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

interface ZoneFormProps {
  /** Zone to edit, or undefined for create mode */
  zone?: ZoneWithStateProvinces;
  /** Region IDs already claimed by other zones */
  unavailableRegions: Set<string>;
  onSave: (
    displayName: string,
    description: string | null,
    stateProvinces: string[],
    mapImageBlob: Blob | null,
    qboClassMappings: ZoneQboClassMapping[],
  ) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function ZoneForm({ zone, unavailableRegions, onSave, onCancel, saving }: ZoneFormProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [displayName, setDisplayName] = useState(zone?.display_name ?? "");
  const [description, setDescription] = useState(zone?.description ?? "");
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    () =>
      new Set(
        zone?.state_provinces.map((sp) => NAME_TO_ABBREV[sp.state_province] ?? sp.state_province) ??
          [],
      ),
  );

  // Per-connection QBO class mappings: { [connectionId]: classId | null }
  const [qboClassMap, setQboClassMap] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    if (zone?.qbo_classes) {
      for (const qc of zone.qbo_classes) {
        map[qc.qbo_connection_uuid] = qc.qbo_class_id;
      }
    }
    return map;
  });

  const { data: qboConnections = [] } = useQuery<QboConnection[]>({
    queryKey: ["qbo-connections"],
    queryFn: fetchQboConnections,
  });

  const handleToggleRegion = useCallback((regionId: string) => {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    // Auto-generate map image from current selection
    let blob: Blob | null = null;
    if (selectedRegions.size > 0) {
      const svg = mapRef.current?.querySelector("svg");
      if (svg) {
        blob = await generateMapBlob(svg, selectedRegions);
      }
    }

    await onSave(
      displayName.trim(),
      description.trim() || null,
      Array.from(selectedRegions).map((abbrev) => ABBREV_TO_NAME[abbrev] ?? abbrev),
      blob,
      Object.entries(qboClassMap)
        .filter((entry): entry is [string, string] => entry[1] != null && entry[1] !== "")
        .map(([connectionId, classId]) => ({ connectionId, classId })),
    );
  };

  const selectedEntries = Array.from(selectedRegions)
    .map((abbrev) => ({ abbrev, name: ABBREV_TO_NAME[abbrev] ?? abbrev }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left side: form fields */}
        <div className="lg:w-1/3 space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Zone Name *
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Northeast, Midwest..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* QuickBooks Classes (per connection) */}
          {qboConnections.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">QuickBooks Classes</p>
              {qboConnections.map((conn) => (
                <div key={conn.id}>
                  <label className="block text-xs text-gray-500 mb-1">{conn.display_name}</label>
                  <SelectQboClassSimple
                    connectionId={conn.id}
                    value={qboClassMap[conn.id] ?? null}
                    onChange={(val) => setQboClassMap((prev) => ({ ...prev, [conn.id]: val }))}
                    warnWhenEmpty
                  />
                </div>
              ))}
            </div>
          )}

          {/* Selected regions list */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Selected ({selectedRegions.size})
            </p>
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Click states/provinces on the map to select them.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                {selectedEntries.map(({ abbrev, name }) => (
                  <button
                    key={abbrev}
                    type="button"
                    onClick={() => handleToggleRegion(abbrev)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs hover:bg-red-100 hover:text-red-800 transition-colors"
                  >
                    {name}
                    <span className="text-[10px]">✕</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <PrimaryButton
              type="submit"
              loading={saving}
              loadingText="Saving..."
              disabled={!displayName.trim()}
            >
              {zone ? "Update Zone" : "Create Zone"}
            </PrimaryButton>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right side: map */}
        <div className="lg:w-2/3">
          <NorthAmericaMap
            ref={mapRef}
            selectedRegions={selectedRegions}
            onToggleRegion={handleToggleRegion}
            unavailableRegions={unavailableRegions}
          />
        </div>
      </div>
    </form>
  );
}
