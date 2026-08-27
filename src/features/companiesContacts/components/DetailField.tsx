/** Read-only label/value row used by the contact and company detail modals. */
export function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0">
      <span className="w-20 flex-shrink-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800">
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}
