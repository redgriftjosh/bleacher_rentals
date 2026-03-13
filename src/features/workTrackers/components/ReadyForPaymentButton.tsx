"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { CreateBillModal } from "./CreateBillModal";
import { ViewBillModal } from "./ViewBillModal";

type ReadyForPaymentButtonProps = {
  driverUuid: string;
  driverName: string;
  startDate: string;
};

export function ReadyForPaymentButton({
  driverUuid,
  driverName,
  startDate,
}: ReadyForPaymentButtonProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [billId, setBillId] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click navigation
    setIsCreateModalOpen(true);
  };

  const handleSuccess = (newBillId: string) => {
    setBillId(newBillId);
    setIsViewModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="px-3 py-1.5 bg-greenAccent text-white text-xs font-semibold rounded shadow-sm hover:bg-greenAccent/90 transition-all duration-200 flex items-center gap-1.5"
        title="Create QuickBooks bill for this driver"
      >
        <DollarSign className="w-3.5 h-3.5" />
        Ready For Payment?
      </button>

      <CreateBillModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSuccess}
        driverUuid={driverUuid}
        driverName={driverName}
        startDate={startDate}
      />

      {billId && (
        <ViewBillModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setBillId(null);
          }}
          billId={billId}
        />
      )}
    </>
  );
}
