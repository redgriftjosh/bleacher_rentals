"use client";
import { useState, useMemo } from "react";
import { DateTime } from "luxon";
import { Search, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataTable, Column, CellText, CellSecondary, CellBadge } from "@/components/DataTable";
import { FilterButton } from "@/features/quotesAndBookings/components/FilterButton";
import { FilterPanel } from "@/features/quotesAndBookings/components/FilterPanel";
import { useQuotesAndBookingsFilters } from "@/features/quotesAndBookings/hooks/useQuotesAndBookingsFilters";
import { useQuotesAndBookingsData } from "@/features/quotesAndBookings/hooks/useQuotesAndBookingsData";
import type { QuotesBookingsEvent } from "@/features/quotesAndBookings/types";
import { searchEvents } from "@/features/quotesAndBookings/utils/searchEvents";
import {
  isScorecardTemplate,
  filtersForTemplate,
  SCORECARD_TEMPLATES,
} from "@/features/quotesAndBookings/utils/scorecardTemplates";
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

function getStatusVariant(status: string | null): "success" | "warning" | "error" | "default" {
  switch (status?.toLowerCase()) {
    case "booked":
      return "success";
    case "quoted":
      return "warning";
    case "lost":
      return "error";
    default:
      return "default";
  }
}

function capitalizeStatus(status: string | null): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export default function QuotesBookingsPage() {
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");
  const timeRangeParam = searchParams.get("timeRange") as
    | "weekly"
    | "quarterly"
    | "annually"
    | null;

  const accountManagerParam = searchParams.get("accountManager");
  const periodStartParam = searchParams.get("periodStart");
  const activeTemplate = isScorecardTemplate(templateParam) ? templateParam : null;

  const initialOverrides = useMemo(() => {
    if (!activeTemplate || !timeRangeParam) return undefined;
    return filtersForTemplate(activeTemplate, timeRangeParam, "this", accountManagerParam, periodStartParam);
  }, [activeTemplate, timeRangeParam, accountManagerParam, periodStartParam]);

  const {
    filters,
    toggleOpen,
    setStatuses,
    setCreatedRange,
    setEventRange,
    setBookedRange,
    setAccountManagerUserUuid,
    clearFilters,
  } = useQuotesAndBookingsFilters(initialOverrides);

  const { data, isLoading, error } = useQuotesAndBookingsData(filters);
  const [searchQuery, setSearchQuery] = useState("");

  const searchedData = useMemo(() => {
    if (!data) return data;
    return searchEvents(data, searchQuery);
  }, [data, searchQuery]);

  const router = useRouter();

  const periodLabel =
    timeRangeParam === "quarterly"
      ? "this quarter"
      : timeRangeParam === "annually"
        ? "this year"
        : "this week";

  const columns: Column<QuotesBookingsEvent>[] = [
    {
      key: "event_name",
      header: `Event Name (${searchedData?.length ?? 0})`,
      render: (event) => (
        <div>
          <CellText bold>{event.event_name && event.event_name.length > 70 ? `${event.event_name.slice(0, 70)}...` : event.event_name}</CellText>
          <CellSecondary>Created: {formatDate(event.created_at)}</CellSecondary>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (event) => (
        <CellBadge variant={getStatusVariant(event.event_status)}>
          {capitalizeStatus(event.event_status)}
        </CellBadge>
      ),
    },
    {
      key: "account_manager",
      header: "Account Manager",
      render: (event) => (
        <CellText>
          {event.account_manager_first_name || event.account_manager_last_name
            ? `${event.account_manager_first_name || ""} ${event.account_manager_last_name || ""}`.trim()
            : "Not Assigned"}
        </CellText>
      ),
    },
    {
      key: "start_date",
      header: "Start Date",
      render: (event) => <CellSecondary>{formatDate(event.event_start)}</CellSecondary>,
    },
    {
      key: "end_date",
      header: "Booked",
      render: (event) => (
        <CellSecondary>{event.booked_at ? formatDate(event.booked_at) : "—"}</CellSecondary>
      ),
    },
    {
      key: "amount",
      header: `Amount ($${Math.round((searchedData?.reduce((sum, e) => sum + (e.contract_revenue_cents ?? 0), 0) ?? 0) / 100).toLocaleString()})`,
      render: (event) => <CellText bold>{formatCurrency(event.contract_revenue_cents)}</CellText>,
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error loading events: {error.message}</div>
      </div>
    );
  }

  return (
    <main>
      <PageHeader
        title="Quotes & Bookings"
        subtitle="View all events ordered by most recent creation date"
        action={
          <div className="flex items-center gap-2">
            <FilterButton isOpen={filters.isOpen} onClick={toggleOpen} />
            <PrimaryButton onClick={() => router.push("/quotes-bookings/new")}>
              + Create Quote
            </PrimaryButton>
          </div>
        }
      />

      {activeTemplate && (
        <div className="mt-4 rounded-md bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">
                Scorecard: {SCORECARD_TEMPLATES[activeTemplate].label}
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
            {SCORECARD_TEMPLATES[activeTemplate].description}
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
          onCreatedRangeChange={setCreatedRange}
          onEventRangeChange={setEventRange}
          onBookedRangeChange={setBookedRange}
          onAccountManagerChange={setAccountManagerUserUuid}
          onClear={clearFilters}
        />
      </div>

      <div className="relative mt-4 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, manager, date, amount, address, contact, company..."
          className="w-full h-[40px] pl-10 pr-4 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-darkBlue"
        />
      </div>

      <DataTable
        columns={columns}
        data={searchedData}
        keyExtractor={(event) => event.id}
        emptyMessage="No events found"
        isLoading={isLoading}
        loadingMessage="Loading events..."
        onRowClick={(event) => router.push(`/quotes-bookings/${event.id}`)}
      />
    </main>
  );
}
