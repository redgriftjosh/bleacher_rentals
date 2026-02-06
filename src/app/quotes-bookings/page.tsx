"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { DateTime } from "luxon";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataTable, Column, CellText, CellSecondary, CellBadge } from "@/components/DataTable";

type EventWithAccountManager = {
  id: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  event_status: string | null;
  contract_revenue_cents: number | null;
  created_at: string | null;
  account_manager_first_name: string | null;
  account_manager_last_name: string | null;
};

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
  const compiled = useMemo(() => {
    return db
      .selectFrom("Events as e")
      .leftJoin("Users as u", "e.created_by_user_uuid", "u.id")
      .select([
        "e.id as id",
        "e.event_name as event_name",
        "e.event_start as event_start",
        "e.event_end as event_end",
        "e.event_status as event_status",
        "e.contract_revenue_cents as contract_revenue_cents",
        "e.created_at as created_at",
        "u.first_name as account_manager_first_name",
        "u.last_name as account_manager_last_name",
      ])
      .orderBy("e.created_at", "desc")
      .compile();
  }, []);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<EventWithAccountManager>());

  const columns: Column<EventWithAccountManager>[] = [
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
        action={<PrimaryButton onClick={() => {}}>+ Create Quote</PrimaryButton>}
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(event) => event.id}
        emptyMessage="No events found"
        isLoading={isLoading}
        loadingMessage="Loading events..."
      />
    </main>
  );
}
