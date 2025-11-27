"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";

type BleacherCardProps = {
  bleacherNumber: number;
  homeBaseName: string;
  winterHomeBaseName: string;
  bleacherRows: number;
  bleacherSeats: number;
  isSelected: boolean;
  onClick: () => void;
  assignedUser?: {
    clerkUserId: string;
    firstName: string;
    lastName: string;
  } | null;
  isDisabled?: boolean;
};

export function BleacherCard({
  bleacherNumber,
  homeBaseName,
  winterHomeBaseName,
  bleacherRows,
  bleacherSeats,
  isSelected,
  onClick,
  assignedUser,
  isDisabled = false,
}: BleacherCardProps) {
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "relative w-full px-2 rounded border-1 transition-all duration-200 cursor-pointer",
        "flex items-center justify-between",
        isDisabled
          ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-60"
          : isSelected
          ? "border-greenAccent bg-greenAccent/10 hover:shadow-md hover:border-greenAccent/50"
          : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md hover:border-greenAccent/50"
      )}
    >
      <div className="flex flex-col items-start">
        <div
          className={cn(
            "font-bold text-lg -mb-3",
            isDisabled
              ? "text-gray-400"
              : bleacherRows === 7
              ? "text-green-700"
              : bleacherRows === 10
              ? "text-red-700"
              : bleacherRows === 15
              ? "text-yellow-500"
              : ""
          )}
        >
          #{bleacherNumber}
        </div>
        <div className="whitespace-nowrap -mb-3">
          <span
            className={cn("font-medium text-xs", isDisabled ? "text-gray-400" : "text-gray-500")}
          >
            {bleacherRows}
          </span>
          <span
            className={cn(
              "font-medium text-xs mr-2",
              isDisabled ? "text-gray-400" : "text-gray-500"
            )}
          >
            {" "}
            row
          </span>
          <span
            className={cn("font-medium text-xs", isDisabled ? "text-gray-400" : "text-gray-500")}
          >
            {bleacherSeats}
          </span>
          <span
            className={cn("font-medium text-xs", isDisabled ? "text-gray-400" : "text-gray-500")}
          >
            {" "}
            seats
          </span>
        </div>
        <div className="whitespace-nowrap">
          <span
            className={cn(
              "font-medium mr-2 text-xs",
              isDisabled ? "text-gray-400" : "text-amber-500"
            )}
          >
            {homeBaseName}
          </span>
          <span
            className={cn("font-medium text-xs", isDisabled ? "text-gray-400" : "text-blue-500")}
          >
            {winterHomeBaseName}
          </span>
        </div>
      </div>
      {isDisabled && assignedUser ? (
        <UserAvatar
          clerkUserId={assignedUser.clerkUserId}
          firstName={assignedUser.firstName}
          lastName={assignedUser.lastName}
          className="w-8 h-8"
        />
      ) : isSelected ? (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-greenAccent">
          <Check className="w-4 h-4 text-white" />
        </div>
      ) : null}
    </button>
  );
}
