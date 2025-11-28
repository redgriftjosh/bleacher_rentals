"use client";

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email";
  readOnly?: boolean;
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  readOnly = false,
}: TextInputProps) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <label htmlFor={id} className="text-right text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`col-span-3 px-3 py-2 border rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0 ${
          readOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "text-gray-700"
        }`}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
