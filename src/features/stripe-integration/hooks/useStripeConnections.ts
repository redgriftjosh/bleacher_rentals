"use client";

import { useMemo } from "react";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { buildStripeConnectionsQuery, type StripeConnectionRow } from "../stripeConnectionsDb";
import type { StripeConnection } from "../types";

function rowToConnection(row: StripeConnectionRow): StripeConnection {
  return {
    id: row.id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    stripeAccountId: row.stripe_account_id,
    detailsSubmitted: row.details_submitted === 1,
    chargesEnabled: row.charges_enabled === 1,
    payoutsEnabled: row.payouts_enabled === 1,
    livemode: row.livemode === 1,
    businessName: row.stripe_business_name,
  };
}

/**
 * Reactive, local-first list of Stripe connections. Updates automatically when
 * the local PowerSync DB changes -- so a soft delete, a restore, or a status
 * write synced down from the OAuth callback all reflect without a manual
 * refetch.
 *
 * `showDeleted` switches between the active list and the recycle bin.
 */
export function useStripeConnections(params: { showDeleted: boolean }): {
  connections: StripeConnection[];
  isLoading: boolean;
} {
  const { showDeleted } = params;

  const compiled = useMemo(() => buildStripeConnectionsQuery(showDeleted), [showDeleted]);

  const { data, isLoading } = useTypedQuery(compiled, expect<StripeConnectionRow>());

  const connections = useMemo(() => (data ?? []).map(rowToConnection), [data]);
  console.log("useStripeConnections", { showDeleted, connections, isLoading });

  return { connections, isLoading };
}
