import { useEffect, useState } from "react";
import { HomeBase } from "../../hooks/useHomeBases";

// type HomeBaseDropDown = {
//   homeBaseId: number;
//   homeBaseName: string;
// };

type selectHomeBaseDropDownProps = {
  options: HomeBase[];
  onSelect: (selected: HomeBase) => void;
  placeholder?: string;
  value?: string;
};

const selectHomeBaseDropDown: React.FC<selectHomeBaseDropDownProps> = ({
  options,
  onSelect,
  placeholder = "Home Base",
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<HomeBase | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      const selectedOption = options.find((option) => option.id === value);
      setSelected(selectedOption ?? null);
    }
  }, [value]);

  const handleSelect = (option: HomeBase) => {
    setSelected(option);
    onSelect(option);
    setIsOpen(false);
  };

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
            <div>{`${selected.home_base_name}`}</div>
          </div>
        ) : (
          placeholder
        )}
        <span className="ml-2 self-center">▼</span>
      </button>
      {isOpen && (
        <div className="absolute mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <ul className="py-1 max-h-[300px] overflow-y-auto">
            {options.map((option, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(option)}
              >
                <div className="text-sm font-medium">{`${option.home_base_name}`}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default selectHomeBaseDropDown;
