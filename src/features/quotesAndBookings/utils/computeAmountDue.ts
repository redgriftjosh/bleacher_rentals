import type { Allocation } from "./allocatePayments";

/**
 * The four figures the public Pay tab shows a client, all derived from one
 * allocation so they cannot contradict each other.
 *
 * The subtlety is `overdueOwedCents`. It used to be "sum of unpaid overdue
 * installments, minus everything ever paid" — which subtracted a targeted
 * payment twice, since its installment had already dropped out of the sum.
 * Here each installment contributes only the part it is still missing.
 */
export type AmountDue = {
  paidCents: number;
  remainingCents: number;
  overdueOwedCents: number;
  /** What the pay button offers by default. */
  defaultPayCents: number;
};

export function computeAmountDue({
  allocation,
  totalCents,
  today,
}: {
  allocation: Allocation;
  totalCents: number;
  today: string; // YYYY-MM-DD
}): AmountDue {
  const paidCents = allocation.totalReceivedCents;
  const remainingCents = Math.max(totalCents - paidCents, 0);

  const hasSchedule = allocation.installments.length > 0;

  const overdueOwedCents = hasSchedule
    ? allocation.installments
        .filter((i) => i.dueDate <= today)
        .reduce((sum, i) => sum + Math.max(0, i.amountCents - i.allocatedCents), 0)
    : remainingCents;

  return {
    paidCents,
    remainingCents,
    overdueOwedCents: Math.min(overdueOwedCents, remainingCents),
    defaultPayCents: Math.min(overdueOwedCents, remainingCents),
  };
}
