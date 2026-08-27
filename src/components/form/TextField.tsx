"use client";

const BASE_INPUT =
  "w-full h-9 px-3 bg-gray-50 border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors";
const VALID_INPUT = "border-gray-200 focus:ring-blue-400/20 focus:border-blue-400";
const INVALID_INPUT = "border-red-300 focus:ring-red-400/20 focus:border-red-400";

export const FIELD_LABEL =
  "block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  required?: boolean;
  /** Message to show under the input; also switches the input to its invalid style. */
  error?: string;
  onBlur?: () => void;
};

/** Labelled text input with inline validation feedback. */
export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  error,
  onBlur,
}: TextFieldProps) {
  return (
    <div>
      <label className={FIELD_LABEL}>
        {label}
        {required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`${BASE_INPUT} ${error ? INVALID_INPUT : VALID_INPUT}`}
      />
      <FieldError message={error} />
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

/** Labelled textarea sharing the TextField chrome. */
export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className={FIELD_LABEL}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
      />
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}
