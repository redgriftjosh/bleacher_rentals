"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { DriverWithMeta } from "../db/db";

type Props = {
  driver: DriverWithMeta;
};

export function TotalsMatch({ driver }: Props) {
  const { workTrackerGroup, totalPayCents, qbo_connection_uuid, tax } = driver;
  const billId = workTrackerGroup?.qbo_bill_id;

  const [isLoading, setIsLoading] = useState(false);
  const [match, setMatch] = useState<boolean | null>(null);
  const [qboTotal, setQboTotal] = useState<number | null>(null);

  const expectedTotal = (totalPayCents / 100) * (1 + tax / 100);

  useEffect(() => {
    if (!billId || !qbo_connection_uuid) return;

    let cancelled = false;

    async function fetchBill() {
      setIsLoading(true);
      setMatch(null);
      try {
        const url = `/api/quickbooks/get-bill?billId=${billId}&connectionId=${encodeURIComponent(qbo_connection_uuid!)}`;
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const qboAmt: number = data.totalAmt ?? 0;
        if (!cancelled) {
          setQboTotal(qboAmt);
          setMatch(Math.abs(qboAmt - expectedTotal) < 0.02);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBill();
    return () => {
      cancelled = true;
    };
  }, [billId, qbo_connection_uuid, totalPayCents, tax]);

  if (!billId || !qbo_connection_uuid) return null;

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
  }

  if (match === null) return null;

  if (match) {
    return (
      <span title={`QBO total matches: $${qboTotal?.toFixed(2)}`}>
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      </span>
    );
  }

  return (
    <span
      title={`Mismatch — QBO: $${qboTotal?.toFixed(2)} | Expected: $${expectedTotal.toFixed(2)}`}
    >
      <AlertTriangle className="w-4 h-4 text-amber-500" />
    </span>
  );
}
