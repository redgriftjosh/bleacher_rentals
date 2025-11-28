interface SectionButtonProps {
  isActive: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
}

export default function SectionButton({
  isActive,
  onClick,
  activeLabel,
  inactiveLabel,
}: SectionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
        isActive
          ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
          : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
      }`}
    >
      {isActive ? "Undo" : inactiveLabel}
    </button>
  );
}
