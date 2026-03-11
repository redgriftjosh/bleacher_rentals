"use client";

import React from "react";
import { ZoneWithStateProvinces } from "../_lib/types";

interface ZoneCardProps {
  zone: ZoneWithStateProvinces;
  onEdit: (zone: ZoneWithStateProvinces) => void;
}

export function ZoneCard({ zone, onEdit }: ZoneCardProps) {
  const regionNames = zone.state_provinces
    .map((sp) => sp.state_province)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
      {zone.photo_path && (
        <img
          src={zone.photo_path}
          alt={`${zone.display_name} zone map`}
          className="w-full h-40 object-contain rounded-md mb-3 bg-sky-50"
        />
      )}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{zone.display_name}</h3>
            {(!zone.qbo_classes || zone.qbo_classes.length === 0) && (
              <span
                title="No QuickBooks class assigned"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex-shrink-0"
              >
                !
              </span>
            )}
          </div>
          {zone.description && <p className="text-sm text-gray-500 mt-0.5">{zone.description}</p>}
        </div>
        <button
          onClick={() => onEdit(zone)}
          className="px-3 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {regionNames.length === 0 ? (
          <span className="text-xs text-gray-400 italic">No states/provinces assigned</span>
        ) : (
          regionNames.map((name) => (
            <span
              key={name}
              className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs"
            >
              {name}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
