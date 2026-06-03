"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PermissionBadge } from "./PermissionBadge";
import { ROLE_LABELS, DEFAULT_NOTES, type PermissionLevel } from "../../permissionPageData";
import type { WebRole } from "../../logic/determineAccess";

export type PermissionDetailData =
  | {
      kind: "badge";
      label: string;
      category: string;
      role: WebRole;
      level: PermissionLevel;
      note?: string;
    }
  | {
      kind: "description";
      label: string;
      category: string;
      description: string;
    };

type PermissionDetailModalProps = {
  data: PermissionDetailData | null;
  onClose: () => void;
};

export function PermissionDetailModal({ data, onClose }: PermissionDetailModalProps) {
  if (!data) return null;

  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-darkBlue">{data.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Category:</span>
            <span className="text-sm text-gray-700">{data.category}</span>
          </div>

          {data.kind === "badge" && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Role:</span>
                <span className="text-sm font-semibold text-darkBlue">
                  {ROLE_LABELS[data.role]}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Access:</span>
                <PermissionBadge level={data.level} />
              </div>
            </>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {data.kind === "badge" ? (data.note ?? DEFAULT_NOTES[data.level]) : data.description}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
