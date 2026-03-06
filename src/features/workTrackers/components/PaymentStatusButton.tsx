"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { WorkTrackerGroupModal } from "./WorkTrackerGroupModal";
import type { DriverWithMeta } from "../db/db";
import Image from "next/image";

type PaymentStatusButtonProps = {
  driver: DriverWithMeta;
  weekStart: string; // ISO date string
  weekEnd: string; // ISO date string
};

export function PaymentStatusButton({ driver, weekStart, weekEnd }: PaymentStatusButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const group = driver.workTrackerGroup;
  const status = group?.status || "draft";

  // Determine button appearance based on status
  const getButtonConfig = () => {
    switch (status) {
      case "draft":
        return {
          variant: "outline" as const,
          className: "border-gray-300 text-gray-600 hover:bg-gray-50",
          icon: <FileText className="w-4 h-4" />,
          label: "Draft",
        };
      case "qbo_bill_creating":
        return {
          variant: "outline" as const,
          className: "border-blue-300 bg-blue-50 text-blue-600",
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: "Creating Bill...",
        };
      case "qbo_bill_error":
        return {
          variant: "destructive" as const,
          className: "bg-red-600 hover:bg-red-700 text-white",
          icon: <AlertTriangle className="w-4 h-4" />,
          label: "Error",
        };
      case "no_bill_ready_for_payment":
        return {
          variant: "outline" as const,
          className: "border-green-300 bg-green-50 text-green-700",
          icon: <CheckCircle className="w-4 h-4" />,
          label: "Ready for Payment",
        };
      case "qbo_bill_created":
        return {
          variant: "outline" as const,
          className: "border-[#2ba248] bg-[#2ba248]/10 text-[#2ba248]",
          icon: (
            <div className="w-4 h-4 rounded-full bg-[#2ba248] flex items-center justify-center p-0.5">
              <Image
                src="/qbo-icon-white-no-circle.png"
                alt="QuickBooks"
                width={16}
                height={16}
                className="w-full h-full"
              />
            </div>
          ),
          label: "Bill Created",
        };
      default:
        return {
          variant: "outline" as const,
          className: "border-gray-300 text-gray-600",
          icon: <FileText className="w-4 h-4" />,
          label: "Unknown Status",
        };
    }
  };

  const config = getButtonConfig();

  return (
    <>
      <Button
        variant={config.variant}
        size="sm"
        className={`flex items-center gap-2 ${config.className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
      >
        {config.icon}
        {config.label}
      </Button>

      <WorkTrackerGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverUuid={driver.driver_uuid}
        driverName={`${driver.first_name} ${driver.last_name}`}
        startDate={weekStart}
        groupData={
          group
            ? {
                id: group.id,
                status: group.status,
                qbo_bill_id: group.qbo_bill_id,
              }
            : null
        }
      />
    </>
  );
}
