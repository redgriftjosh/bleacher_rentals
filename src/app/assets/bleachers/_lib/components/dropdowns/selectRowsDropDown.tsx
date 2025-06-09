import { ROW_OPTIONS } from "@/types/Constants";
import { useEffect, useState } from "react";

type selectRowsDropDownProps = {
  onSelect: (selected: number) => void;
  value?: number;
};

const selectRowsDropDown: React.FC<selectRowsDropDownProps> = ({ onSelect, value }) => {
  const placeholder = "Rows";
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(value ?? null);

  const handleSelect = (option: number) => {
    setSelected(option);
    onSelect(option);
    setIsOpen(false);
  };

  useEffect(() => {
    if (value !== undefined) {
      setSelected(value);
    }
  }, [value]);

  return (
    // <div className="relative inline-block text-left" style={{ minWidth: "300px" }}>

    <div className="relative inline-block text-left flex-1 col-span-3">
      <button
        type="button"
        className="inline-flex justify-between w-full rounded-md border border-gray-250 px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selected ? (
          <div className="text-left">
            <div>{`${selected}`}</div>
          </div>
        ) : (
          placeholder
        )}
        <span className="ml-2 self-center">▼</span>
      </button>
      {isOpen && (
        <div className="absolute mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <ul className="py-1 max-h-[300px] overflow-y-auto">
            {ROW_OPTIONS.map((option, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(option)}
              >
                <div className="text-sm font-medium">{`${option}`}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default selectRowsDropDown;
