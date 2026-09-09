"use client";

import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { parseGoogleAddressComponents } from "./parseGoogleAddressComponents";

interface AddressData {
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  country?: string;
}

interface AddressAutocompleteProps {
  onAddressSelect: (data: AddressData) => void;
  initialValue?: string;
  className?: string;
}

export default function AddressAutocomplete({
  onAddressSelect,
  initialValue,
  className = "",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0, width: 0 });
  const addressData = useCurrentEventStore().addressData;
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    defaultValue: initialValue,
    debounce: 300,
  });

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue, false);
    } else {
      setValue(addressData?.address ?? "", false);
    }
  }, [initialValue, addressData]);

  useEffect(() => {
    if (status === "OK" && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setSuggestionPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [status]);

  const handleSelect = async (description: string, placeId: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      // Geocode the specific place the user picked, not the raw suggestion
      // text — forward-geocoding a compound string like "Business Name,
      // Street, City, Province, Country" leaves Google guessing at which
      // part is which, and it guesses wrong often enough (a rural/business
      // result's county ending up in `city` instead of its actual town).
      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);
      const { address, city, state, postalCode, country } = parseGoogleAddressComponents(
        results[0].address_components,
        description,
      );

      onAddressSelect({ address, city, state, postalCode, lat, lng, placeId, country });
    } catch (error) {
      console.error("Error fetching address details:", error);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <input
          ref={inputRef}
          className={`w-full p-2 border rounded ${className}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Enter address..."
        />
      </div>

      {typeof window !== "undefined" &&
        createPortal(
          status === "OK" ? (
            <ul
              className="absolute bg-white border shadow-lg rounded z-[9999]"
              style={{
                top: suggestionPos.top,
                left: suggestionPos.left,
                width: suggestionPos.width,
                position: "absolute",
                pointerEvents: "auto",
              }}
            >
              {data.map(({ place_id, description }) => (
                <li
                  key={place_id}
                  className="p-2 cursor-pointer hover:bg-gray-200 text-sm"
                  onClick={() => handleSelect(description, place_id)}
                >
                  {description}
                </li>
              ))}
            </ul>
          ) : null,
          document.body,
        )}
    </>
  );
}
