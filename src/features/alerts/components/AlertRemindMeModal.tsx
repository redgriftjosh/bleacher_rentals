"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
};

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AlertRemindMeModal({ open, onClose, onConfirm }: Props) {
  const [date, setDate] = useState<string>(addDays(7));

  const handleConfirm = () => {
    onConfirm(date);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remind Me Later</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Date</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-darkBlue"
            value={date}
            min={addDays(1)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <DialogFooter>
          <button
            className="px-4 py-2 text-sm border border-gray-300 rounded-sm hover:bg-gray-50 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm bg-darkBlue text-white rounded-sm hover:bg-lightBlue cursor-pointer"
            onClick={handleConfirm}
          >
            Set Reminder
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
