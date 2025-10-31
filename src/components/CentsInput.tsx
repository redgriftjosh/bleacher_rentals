type CentsInputProps = {
  value: string;
  onChange: (value: string, cents: number | null) => void;
  placeholder?: string;
  className?: string;
};

export default function CentsInput({
  value,
  onChange,
  placeholder = "0.00",
  className = "",
}: CentsInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Allow empty input for backspacing
    if (raw === "") {
      onChange("", null);
      return;
    }

    // Only allow numbers with max 2 decimals
    const validFormat = /^\d*\.?\d{0,2}$/;
    if (!validFormat.test(raw)) return;

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(raw, Math.round(parsed * 100));
    } else {
      onChange(raw, null);
    }
  }

  return (
    <input
      type="number"
      className={`${className} [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] !pl-2`}
      step="0.01"
      min="0"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
