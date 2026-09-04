"use client";
import { useState, useMemo, useCallback } from "react";
import { DateTime } from "luxon";
import { Search, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataTable, Column, CellText, CellSecondary, CellBadge } from "@/components/DataTable";
import { FilterButton } from "@/features/quotesAndBookings/components/FilterButton";
import { FilterPanel } from "@/features/quotesAndBookings/components/FilterPanel";
import { useQuotesAndBookingsFilters } from "@/features/quotesAndBookings/hooks/useQuotesAndBookingsFilters";
import { useQuotesAndBookingsData } from "@/features/quotesAndBookings/hooks/useQuotesAndBookingsData";
import {
  useCreateQuoteStore,
  hasUnsavedChanges,
} from "@/features/quotesAndBookings/state/useCreateQuoteStore";
import {
  NEW_QUOTE_CLIENT_NOTES,
  shouldPrefillNewQuoteNotes,
} from "@/features/quotesAndBookings/utils/newQuoteNotes";
import type { QuotesBookingsEvent } from "@/features/quotesAndBookings/types";
import { searchEvents } from "@/features/quotesAndBookings/utils/searchEvents";
import { eventSubtotalCents, eventTaxCents } from "@/features/quotesAndBookings/utils/eventAmounts";
import {
  pickEventCurrency,
  sumByCurrency,
  formatTotalsLabel,
} from "@/features/quotesAndBookings/utils/eventCurrency";
import { formatMoney } from "@/features/quotesAndBookings/utils/formatMoney";
import { useOfficeCurrencies } from "@/features/quotesAndBookings/hooks/useOfficeCurrencies";
import { isInGoodShuffle } from "@/features/quotesAndBookings/utils/filterEvents";
import { GoodShuffleBadge } from "@/features/quotesAndBookings/components/GoodShuffleBadge";
import {
  isScorecardTemplate,
  filtersForTemplate,
  SCORECARD_TEMPLATES,
} from "@/features/quotesAndBookings/utils/scorecardTemplates";
import { useRouter, useSearchParams } from "next/navigation";

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
    return filtersForTemplate(
      activeTemplate,
      timeRangeParam,
      "this",
      accountManagerParam,
      periodStartParam,
    );
  }, [activeTemplate, timeRangeParam, accountManagerParam, periodStartParam]);

  const {
    filters,
    toggleOpen,
    setStatuses,
    setCreatedRange,
    setEventRange,
    setBookedRange,
    setAccountManagerUserUuid,
    setInGoodShuffle,
    setInQuickBooks,
    setSalesOfficeUuid,
    clearFilters,
  } = useQuotesAndBookingsFilters(initialOverrides);

  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading, error } = useQuotesAndBookingsData(filters, showDeleted);
  const [searchQuery, setSearchQuery] = useState("");

  const searchedData = useMemo(() => {
    if (!data) return data;
    return searchEvents(data, searchQuery);
  }, [data, searchQuery]);

  // Money columns are per-office: a quote out of a Canadian office is shown in
  // C$, and the column totals keep the two currencies apart.
  const { currencyByOfficeId } = useOfficeCurrencies();
  const currencyOf = useCallback(
    (event: QuotesBookingsEvent) => pickEventCurrency(event.sales_office_uuid, currencyByOfficeId),
    [currencyByOfficeId],
  );

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
        <div className="max-w-[240px] 2xl:max-w-[320px]">
          <CellText bold>
            <span className="flex items-center gap-1.5">
              {isInGoodShuffle(event) && <GoodShuffleBadge />}
              <span className="truncate" title={event.event_name ?? undefined}>
                {event.event_name}
              </span>
            </span>
          </CellText>
          <CellSecondary>Created: {formatDate(event.created_at)}</CellSecondary>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (event) =>
        event.deleted === 1 ? (
          <CellBadge variant="error">Deleted</CellBadge>
        ) : (
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
      key: "subtotal",
      header: formatTotalsLabel(
        "Subtotal",
        sumByCurrency(searchedData, eventSubtotalCents, currencyOf),
      ),
      align: "right",
      render: (event) => (
        <CellText bold>{formatMoney(eventSubtotalCents(event), currencyOf(event))}</CellText>
      ),
    },
    {
      key: "tax",
      header: formatTotalsLabel("Tax", sumByCurrency(searchedData, eventTaxCents, currencyOf)),
      align: "right",
      render: (event) => (
        <CellText bold>{formatMoney(eventTaxCents(event), currencyOf(event))}</CellText>
      ),
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
            <button
              type="button"
              role="switch"
              aria-checked={showDeleted}
              onClick={() => setShowDeleted((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none"
            >
              <span>Show Deleted</span>
              <span
                className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200 ${
                  showDeleted ? "bg-darkBlue" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-[2px] ${
                    showDeleted ? "translate-x-[20px]" : "translate-x-[2px]"
                  }`}
                />
              </span>
            </button>
            <FilterButton isOpen={filters.isOpen} onClick={toggleOpen} />
            <PrimaryButton
              onClick={() => {
                const store = useCreateQuoteStore.getState();
                if (
                  shouldPrefillNewQuoteNotes({
                    editingEventId: store.editingEventId,
                    hasUnsavedChanges: hasUnsavedChanges(),
                  })
                ) {
                  store.setField("clientFacingNotes", NEW_QUOTE_CLIENT_NOTES);
                }
                router.push("/quotes-bookings/new");
              }}
            >
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
              onClick={() =>
                router.push("/scorecard" + (timeRangeParam ? `?timeRange=${timeRangeParam}` : ""))
              }
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Scorecard
            </button>
          </div>
          <p className="mt-1 text-indigo-700">{SCORECARD_TEMPLATES[activeTemplate].description}</p>
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
          onInGoodShuffleChange={setInGoodShuffle}
          onInQuickBooksChange={setInQuickBooks}
          onSalesOfficeChange={setSalesOfficeUuid}
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
