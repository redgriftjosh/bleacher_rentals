"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { DateTime } from "luxon";

type ViewBillModalProps = {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
};

type BillData = {
  id: string;
  docNumber: string;
  txnDate: string;
  vendorRef: {
    value: string;
    name: string;
  };
  lineItems: Array<{
    id: string;
    description: string;
    amount: number;
    accountRef: {
      value: string;
      name: string;
    };
    classRef: {
      value: string;
      name: string;
    } | null;
  }>;
  totalAmt: number;
  balance: number;
};

export function ViewBillModal({ isOpen, onClose, billId }: ViewBillModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [billData, setBillData] = useState<BillData | null>(null);

  useEffect(() => {
    if (!isOpen || !billId) return;

    async function fetchBillData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/quickbooks/get-bill?billId=${billId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch bill");
        }

        const data = await response.json();
        setBillData(data);
      } catch (error: any) {
        console.error("Error fetching bill:", error);
        createErrorToastNoThrow(["Failed to load bill data", error.message]);
        onClose();
      } finally {
        setIsLoading(false);
      }
    }

    fetchBillData();
  }, [isOpen, billId, onClose]);

  const handleViewInQuickBooks = () => {
    const qboUrl = process.env.NEXT_PUBLIC_QBO_URL || "https://qbo.intuit.com";
    window.open(`${qboUrl}/app/bill?txnId=${billId}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Loading bill details...</p>
          </div>
        ) : billData ? (
          <div className="py-4 space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div>
                <span className="text-sm text-gray-600">Vendor/Supplier</span>
                <p className="font-semibold text-lg">{billData.vendorRef.name}</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">Bill Number</span>
                <p className="font-semibold text-lg">#{billData.docNumber}</p>
              </div>
            </div>

            <div className="pb-4 border-b">
              <span className="text-sm text-gray-600">Bill Date</span>
              <p className="font-semibold">
                {DateTime.fromISO(billData.txnDate).toFormat("MMM dd, yyyy")}
              </p>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
              <div className="space-y-2">
                {billData.lineItems.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.accountRef.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        {item.classRef && (
                          <p className="text-xs text-gray-500 mt-1">Class: {item.classRef.name}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-900">${item.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${billData.totalAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-greenAccent">${billData.totalAmt.toFixed(2)}</span>
              </div>
              {billData.balance > 0 && (
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-600">Balance Due</span>
                  <span className="font-semibold text-red-600">${billData.balance.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                onClick={handleViewInQuickBooks}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View in QuickBooks
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No bill data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
