"use client";
import { DateTime } from "luxon";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataTable, Column, CellText, CellSecondary, CellBadge } from "@/components/DataTable";
import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";
import { loadEventForModal } from "@/features/eventConfiguration/functions/loadEventForModal";
import { FilterButton } from "@/features/quotesAndBookings/components/FilterButton";
import { FilterPanel } from "@/features/quotesAndBookings/components/FilterPanel";
import { useQuotesAndBookingsFilters } from "@/features/quotesAndBookings/hooks/useQuotesAndBookingsFilters";
import { useQuotesAndBookingsData } from "@/features/quotesAndBookings/hooks/useQuotesAndBookingsData";
import type { QuotesBookingsEvent } from "@/features/quotesAndBookings/types";

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
  const openModal = useCurrentEventStore((s) => s.openModal);
  const {
    filters,
    toggleOpen,
    setStatuses,
    setCreatedRange,
    setEventRange,
    setAccountManagerUserUuid,
    clearFilters,
  } = useQuotesAndBookingsFilters();

  const { data, isLoading, error } = useQuotesAndBookingsData(filters);

  const columns: Column<QuotesBookingsEvent>[] = [
    {
      key: "event_name",
      header: "Event Name",
      render: (event) => <CellText bold>{event.event_name}</CellText>,
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
      header: "End Date",
      render: (event) => <CellSecondary>{formatDate(event.event_end)}</CellSecondary>,
    },
    {
      key: "amount",
      header: "Amount",
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
            <PrimaryButton onClick={openModal}>+ Create Quote</PrimaryButton>
          </div>
        }
      />

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
          onAccountManagerChange={setAccountManagerUserUuid}
          onClear={clearFilters}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(event) => event.id}
        emptyMessage="No events found"
        isLoading={isLoading}
        loadingMessage="Loading events..."
        onRowClick={(event) => loadEventForModal(event.id)}
      />
    </main>
  );
}
