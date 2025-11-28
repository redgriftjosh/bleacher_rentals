"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserSection } from "./sections/UserSection";
import { DriverSection } from "./sections/DriverSection";
import { AccountManagerSection } from "./sections/AccountManagerSection";
import ActionButtons from "./inputs/ActionButtons";
import { useCurrentUserStore } from "../state/useCurrentUserStore";
import { calculateUserAlerts } from "../util/alerts";

export function UserConfigurationModal() {
  const isOpen = useCurrentUserStore((s) => s.isOpen);
  const setIsOpen = useCurrentUserStore((s) => s.setIsOpen);
  const existingUserId = useCurrentUserStore((s) => s.existingUserId);
  const state = useCurrentUserStore();
  const resetForm = useCurrentUserStore((s) => s.resetForm);

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  // Calculate validation alerts
  const alerts = calculateUserAlerts(state);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingUserId ? "Edit User Configuration" : "Add New User"}</DialogTitle>
          <DialogDescription>
            Configure user details, roles, and permissions. All sections marked with * are required.
          </DialogDescription>
          {alerts.length > 0 && (
            <div className="-mt-2 space-y-0">
              {alerts.map((alert, index) => (
                <p key={index} className="text-sm text-red-700">
                  • {alert}
                </p>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-2">
          {/* User Section - Always shown */}
          <UserSection />

          {/* Driver Section - Always shown with toggle */}
          <DriverSection />

          {/* Account Manager Section - Always shown with toggle */}
          <AccountManagerSection />
        </div>

        <ActionButtons />
      </DialogContent>
    </Dialog>
  );
}
