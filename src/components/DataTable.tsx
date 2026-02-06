"use client";
import { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[] | null;
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data found",
  isLoading = false,
  loadingMessage = "Loading...",
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">{loadingMessage}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!data || data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4 whitespace-nowrap">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper components for common cell styles
export function CellText({ children, bold = false }: { children: ReactNode; bold?: boolean }) {
  return <div className={`text-sm text-gray-900 ${bold ? "font-medium" : ""}`}>{children}</div>;
}

export function CellSecondary({ children }: { children: ReactNode }) {
  return <div className="text-sm text-gray-500">{children}</div>;
}

type BadgeVariant = "success" | "warning" | "error" | "default";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-800 border-green-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  error: "bg-red-100 text-red-800 border-red-300",
  default: "bg-gray-100 text-gray-800 border-gray-300",
};

export function CellBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${badgeVariantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
