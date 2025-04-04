import { useEffect } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

interface AddressData {
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface AddressAutocompleteProps {
  onAddressSelect: (data: AddressData) => void;
  initialValue?: string;
}

export default function AddressAutocomplete({
  onAddressSelect,
  initialValue,
}: AddressAutocompleteProps) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    defaultValue: initialValue,
    debounce: 300, // Avoid unnecessary API calls
  });

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue, false);
    }
  }, [initialValue]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });

      // Extract address components
      const state = results[0].address_components.find((comp: AddressComponent) =>
        comp.types.includes("administrative_area_level_1"),
      )?.long_name;

      const city = results[0].address_components.find((comp: AddressComponent) =>
        comp.types.includes("locality"),
      )?.long_name;

      const postalCode = results[0].address_components.find((comp: AddressComponent) =>
        comp.types.includes("postal_code"),
      )?.long_name;

      onAddressSelect({ address, city, state, postalCode });
    } catch (error) {
      console.error("Error fetching address details:", error);
    }
  };

  return (
    <div className="relative w-full">
      <input
        className="w-full p-2 border rounded"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Enter address..."
      />
      {status === "OK" && (
        <ul className="absolute left-0 w-full bg-white border shadow-lg z-10">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleSelect(description)}
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
