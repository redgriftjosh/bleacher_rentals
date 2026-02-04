type StatusValueCardProps = {
  status: "PENDING" | "SIGNED" | "LOST";
  count: number;
  value: number;
};

export function StatusValueCard({ status, count, value }: StatusValueCardProps) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const colorClasses = {
    PENDING: {
      bg: "bg-yellow-100",
      border: "border-yellow-200",
      label: "text-yellow-600/75",
      count: "text-yellow-900",
      value: "text-yellow-700",
    },
    SIGNED: {
      bg: "bg-green-100",
      border: "border-green-200",
      label: "text-green-600/75",
      count: "text-green-900",
      value: "text-green-700",
    },
    LOST: {
      bg: "bg-red-100",
      border: "border-red-200",
      label: "text-red-600/75",
      count: "text-red-900",
      value: "text-red-700",
    },
  };

  const colors = colorClasses[status];

  return (
    <div
      className={`flex flex-col ${colors.bg} border ${colors.border} rounded px-3 py-1.5`}
      //   style={{ width: "100px" }}
    >
      <div className="flex items-center gap-1.5">
        {/* <span className={`${colors.count} font-bold`}>{count}</span> */}
        <span className={`${colors.label} font-semibold text-xs`}>
          {count + " " + status + " • " + formatCurrency(value)}
        </span>
      </div>
      {/* <span className={`${colors.value} font-semibold text-md text-center`}>
        {formatCurrency(value)}
      </span> */}
    </div>
  );
}
