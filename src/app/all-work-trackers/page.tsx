"use client";
import { useState, useMemo } from "react";
import { DateTime } from "luxon";
import { Search, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column, CellText, CellSecondary, CellBadge } from "@/components/DataTable";
import { FilterButton } from "@/features/quotesAndBookings/components/FilterButton";
import { FilterPanel } from "@/features/allWorkTrackers/components/FilterPanel";
import { useAllWorkTrackersFilters } from "@/features/allWorkTrackers/hooks/useAllWorkTrackersFilters";
import { useAllWorkTrackersData } from "@/features/allWorkTrackers/hooks/useAllWorkTrackersData";
import { searchWorkTrackers } from "@/features/allWorkTrackers/utils/searchWorkTrackers";
import {
  isWorkTrackerTemplate,
  filtersForWorkTrackerTemplate,
  WORK_TRACKER_TEMPLATES,
} from "@/features/allWorkTrackers/utils/workTrackerTemplates";
import type { WorkTrackerRow } from "@/features/allWorkTrackers/types";
import { formatValue } from "@/utils/formatters";
import { useRouter, useSearchParams } from "next/navigation";

function formatCurrency(cents: number | null): string {
  if (cents === null) return "$0.00";
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = DateTime.fromISO(dateString);
  if (!date.isValid) return "Invalid Date";
  return date.toFormat("MMM d, yyyy");
}

function getStatusVariant(
  status: string | null,
): "success" | "warning" | "error" | "default" {
  switch (status?.toLowerCase()) {
    case "completed":
      return "success";
    case "released":
    case "accepted":
      return "warning";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

function capitalizeStatus(status: string | null): string {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function AllWorkTrackersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateParam = searchParams.get("template");
  const timeRangeParam = searchParams.get("timeRange") as
    | "weekly"
    | "quarterly"
    | "annually"
    | null;

  const accountManagerParam = searchParams.get("accountManager");
  const periodStartParam = searchParams.get("periodStart");
  const activeTemplate = isWorkTrackerTemplate(templateParam) ? templateParam : null;

  const initialOverrides = useMemo(() => {
    if (!activeTemplate || !timeRangeParam) return undefined;
    return filtersForWorkTrackerTemplate(activeTemplate, timeRangeParam, "this", accountManagerParam, periodStartParam);
  }, [activeTemplate, timeRangeParam, accountManagerParam, periodStartParam]);

  const {
    filters,
    toggleOpen,
    setStatuses,
    setDateRange,
    setCompletedRange,
    setDriverUuid,
    setAccountManagerUuid,
    clearFilters,
  } = useAllWorkTrackersFilters(initialOverrides);

  const { data, isLoading, error } = useAllWorkTrackersData(filters);
  const [searchQuery, setSearchQuery] = useState("");

  const searchedData = useMemo(() => {
    if (!data) return data;
    return searchWorkTrackers(data, searchQuery);
  }, [data, searchQuery]);

  const periodLabel =
    timeRangeParam === "quarterly"
      ? "this quarter"
      : timeRangeParam === "annually"
        ? "this year"
        : "this week";

  const columns: Column<WorkTrackerRow>[] = [
    {
      key: "project",
      header: `Work Tracker (${searchedData?.length ?? 0})`,
      render: (wt) => (
        <div>
          <CellText bold>
            {wt.project_number ? `#${wt.project_number}` : "No Project #"}
            {wt.bleacher_number != null ? ` — Bleacher #${wt.bleacher_number}` : ""}
          </CellText>
          <CellSecondary>Created: {formatDate(wt.created_at)}</CellSecondary>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (wt) => (
        <CellBadge variant={getStatusVariant(wt.status)}>
          {capitalizeStatus(wt.status)}
        </CellBadge>
      ),
    },
    {
      key: "account_manager",
      header: "Account Manager",
      render: (wt) => (
        <CellText>
          {wt.account_manager_first_name || wt.account_manager_last_name
            ? `${wt.account_manager_first_name || ""} ${wt.account_manager_last_name || ""}`.trim()
            : "Not Assigned"}
        </CellText>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      render: (wt) => (
        <CellText>
          {wt.driver_first_name || wt.driver_last_name
            ? `${wt.driver_first_name || ""} ${wt.driver_last_name || ""}`.trim()
            : "Not Assigned"}
        </CellText>
      ),
    },
    {
      key: "date",
      header: "Work Date",
      render: (wt) => <CellSecondary>{formatDate(wt.date)}</CellSecondary>,
    },
    {
      key: "completed",
      header: "Completed",
      render: (wt) => (
        <CellSecondary>{wt.completed_at ? formatDate(wt.completed_at) : "—"}</CellSecondary>
      ),
    },
    {
      key: "pay",
      header: `Pay (${formatValue((searchedData?.reduce((sum, wt) => sum + (wt.pay_cents ?? 0), 0) ?? 0) / 100, "money")})`,
      render: (wt) => <CellText bold>{formatCurrency(wt.pay_cents)}</CellText>,
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error loading work trackers: {error.message}</div>
      </div>
    );
  }

  return (
    <main>
      <PageHeader
        title="All Work Trackers"
        subtitle="View all work trackers ordered by most recent date"
        action={
          <div className="flex items-center gap-2">
            <FilterButton isOpen={filters.isOpen} onClick={toggleOpen} />
          </div>
        }
      />

      {activeTemplate && (
        <div className="mt-4 rounded-md bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">
                Scorecard: {WORK_TRACKER_TEMPLATES[activeTemplate].label}
              </span>
              <span className="text-indigo-600 ml-1">({periodLabel})</span>
            </div>
            <button
              onClick={() => router.push("/scorecard" + (timeRangeParam ? `?timeRange=${timeRangeParam}` : ""))}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Scorecard
            </button>
          </div>
          <p className="mt-1 text-indigo-700">
            {WORK_TRACKER_TEMPLATES[activeTemplate].description}
          </p>
        </div>
      )}

      <div
        className={`overflow-hidden transition-all duration-700 ease-in-out ${
          filters.isOpen ? "max-h-[900px] mt-4" : "max-h-0"
        }`}
      >
        <FilterPanel
          filters={filters}
          onStatusesChange={setStatuses}
          onDateRangeChange={setDateRange}
          onCompletedRangeChange={setCompletedRange}
          onDriverChange={setDriverUuid}
          onAccountManagerChange={setAccountManagerUuid}
          onClear={clearFilters}
        />
      </div>

      <div className="relative mt-4 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by project, driver, date, bleacher, address, pay..."
          className="w-full h-[40px] pl-10 pr-4 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-darkBlue"
        />
      </div>

      <DataTable
        columns={columns}
        data={searchedData}
        keyExtractor={(wt) => wt.id}
        emptyMessage="No work trackers found"
        isLoading={isLoading}
        loadingMessage="Loading work trackers..."
      />
    </main>
  );
}
