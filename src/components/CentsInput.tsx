type CentsInputProps = {
  value: string;
  onChange: (value: string, cents: number | null) => void;
  placeholder?: string;
  className?: string;
};

function formatWithCommas(value: string): string {
  if (!value) return value;

  // Remove existing commas
  const withoutCommas = value.replace(/,/g, "");

  // Split on decimal point
  const parts = withoutCommas.split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart;
}

export default function CentsInput({
  value,
  onChange,
  placeholder = "0.00",
  className = "",
}: CentsInputProps) {
  // Format the display value with commas
  const displayValue = formatWithCommas(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Remove commas for processing
    const withoutCommas = raw.replace(/,/g, "");

    // Allow empty input for backspacing
    if (withoutCommas === "") {
      onChange("", null);
      return;
    }

    // Only allow numbers with max 2 decimals
    const validFormat = /^\d*\.?\d{0,2}$/;
    if (!validFormat.test(withoutCommas)) return;

    const parsed = parseFloat(withoutCommas);
    if (!isNaN(parsed)) {
      // Format with commas for display
      const parts = withoutCommas.split(".");
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const formatted = parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart;

      onChange(formatted, Math.round(parsed * 100));
    } else {
      onChange(withoutCommas, null);
    }
  }

  return (
    <input
      type="text"
      className={`${className} [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] !pl-2`}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
