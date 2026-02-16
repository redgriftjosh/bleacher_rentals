"use client";

type StatHistoryHeaderProps = {
  title: string;
  subtitle: string;
};

export function StatHistoryHeader({ title, subtitle }: StatHistoryHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
