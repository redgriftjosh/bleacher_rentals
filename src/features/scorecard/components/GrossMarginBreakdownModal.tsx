"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type GrossMarginBreakdownModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueDollars: number;
  driverPayDollars: number;
  grossMargin: number;
  periodLabel: string;
};

function formatMoney(dollars: number): string {
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function GrossMarginBreakdownModal({
  open,
  onOpenChange,
  revenueDollars,
  driverPayDollars,
  grossMargin,
  periodLabel,
}: GrossMarginBreakdownModalProps) {
  const profit = revenueDollars - driverPayDollars;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gross Margin Breakdown</DialogTitle>
          <DialogDescription>
            How the gross margin is calculated for {periodLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Numbers */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded">
              <span className="text-gray-700 font-medium">Revenue</span>
              <span className="font-semibold text-green-700">{formatMoney(revenueDollars)}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded">
              <span className="text-gray-700 font-medium">Driver Pay</span>
              <span className="font-semibold text-red-700">- {formatMoney(driverPayDollars)}</span>
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded">
              <span className="text-gray-700 font-medium">Gross Profit</span>
              <span className="font-semibold text-blue-700">{formatMoney(profit)}</span>
            </div>
          </div>

          {/* Formula */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-2">
              Formula
            </p>
            <p className="text-sm font-mono text-gray-800">
              Gross Margin = (Revenue - Driver Pay) / Revenue × 100
            </p>
            <p className="text-sm font-mono text-gray-800 mt-2">
              = ({formatMoney(revenueDollars)} - {formatMoney(driverPayDollars)}) / {formatMoney(revenueDollars)} × 100
            </p>
            <p className="text-sm font-mono text-gray-800 mt-2">
              = <span className="font-bold text-blue-700">{grossMargin}%</span>
            </p>
          </div>

          {/* Explanation */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Revenue</strong> = sum of contract revenue for all booked events with an event start date in this period.
            </p>
            <p>
              <strong>Driver Pay</strong> = sum of all work tracker pay with a work date in this period.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
