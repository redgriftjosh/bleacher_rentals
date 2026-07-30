"use client";

import { useEffect, useState } from "react";
import { useStripeConnections } from "@/features/stripe-integration/hooks/useStripeConnections";
import {
  softDeleteStripeConnection,
  restoreStripeConnection,
} from "@/features/stripe-integration/stripeConnectionsDb";
import { refreshStripeConnectionStatus } from "@/features/stripe-integration/api";
import {
  deriveStripeConnectionStatus,
  type StripeConnection,
} from "@/features/stripe-integration/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import {
  Plus,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Trash2,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

/** Small status pill derived purely from the (reactive) connection row. */
function StatusPill({ conn }: { conn: StripeConnection }) {
  const status = deriveStripeConnectionStatus(conn);

  if (status === "ready") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        Ready{conn.payoutsEnabled ? "" : " (payouts pending)"}
      </span>
    );
  }

  const label =
    status === "pending"
      ? "Pending Stripe review"
      : status === "incomplete"
        ? "Setup incomplete"
        : "Not connected";

  return (
    <span className="flex items-center gap-1 text-xs text-amber-600">
      <AlertTriangle className="h-4 w-4" />
      {label}
    </span>
  );
}

export default function StripeConnectionsPage() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { connections, isLoading } = useStripeConnections({ showDeleted });

  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Surface an error passed back from the OAuth redirect, then strip the query
  // string so a refresh does not re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) setCallbackError(error);
    if (error || params.get("connected")) {
      window.history.replaceState({}, "", "/stripe-connections");
    }
  }, []);

  const handleCheck = async (id: string) => {
    setCheckingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const result = await refreshStripeConnectionStatus(id);
      // The status write syncs down to PowerSync and the row re-renders on its
      // own; we only need to surface an outright failure.
      if (!result.ok && result.error) createErrorToast(["Stripe check failed", result.error]);
    } catch (error) {
      createErrorToast(["Failed to check connection", String(error)]);
    } finally {
      setCheckingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Refresh status for the active connections once on load.
  useEffect(() => {
    if (!showDeleted) connections.forEach((c) => c.stripeAccountId && handleCheck(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections.length, showDeleted]);

  const handleAddConnection = () => {
    // No row is created until OAuth completes -- go straight to Stripe.
    window.location.href = "/api/stripe/connections/authorize";
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await softDeleteStripeConnection(deleteId);
      createSuccessToast(["Connection removed"]);
    } catch (error) {
      createErrorToast(["Failed to remove connection", String(error)]);
    }
    setDeleteId(null);
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreStripeConnection(id);
      createSuccessToast(["Connection restored"]);
    } catch (error) {
      createErrorToast(["Failed to restore connection", String(error)]);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Stripe Connections" />
      <p className="text-sm text-gray-500 mb-6">
        Link your existing Stripe accounts to accept payments. You&apos;ll sign in to Stripe and
        choose which account to connect — no API keys are ever entered or stored here.
      </p>

      {callbackError && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Connection Failed</p>
            <p className="text-sm text-amber-700 mt-1">{callbackError}</p>
          </div>
          <button
            onClick={() => setCallbackError(null)}
            className="text-amber-400 hover:text-amber-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setShowDeleted((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {showDeleted ? "← Back to active connections" : "View removed connections"}
        </button>
        {!showDeleted && (
          <Button size="sm" onClick={handleAddConnection}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading connections...</div>
      ) : connections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            {showDeleted
              ? "No removed connections."
              : "No Stripe connections yet. Add one to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-sm">
                    {conn.businessName ?? "Unnamed account"}
                  </span>
                  {!conn.livemode && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Test
                    </span>
                  )}
                  {!showDeleted && <StatusPill conn={conn} />}
                </div>

                <div className="flex items-center gap-2">
                  {showDeleted ? (
                    <Button variant="outline" size="sm" onClick={() => handleRestore(conn.id)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheck(conn.id)}
                        disabled={checkingIds[conn.id]}
                      >
                        {checkingIds[conn.id] ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        )}
                        Check
                      </Button>
                      {!conn.chargesEnabled && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleAddConnection}
                          title="Reconnect this account"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Reconnect
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(conn.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                {conn.stripeAccountId && <span>Account: {conn.stripeAccountId}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the connection from the active list so payments no longer route through
              it. It can be restored later from &quot;removed connections,&quot; and the Stripe
              account itself is never deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
