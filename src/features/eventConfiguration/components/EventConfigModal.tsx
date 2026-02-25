"use client";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentEventStore } from "../state/useCurrentEventStore";
import { EventConfigurationForm } from "./EventConfigurationForm";

export const EventConfigModal = () => {
  const router = useRouter();
  const isOpen = useCurrentEventStore((s) => s.isModalOpen);
  const closeModal = useCurrentEventStore((s) => s.closeModal);
  const setField = useCurrentEventStore((s) => s.setField);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeModal();
    }
  };

  const handleOpenInDashboard = () => {
    setField("isModalOpen", false);
    setField("isFormExpanded", true);
    setField("isFormMinimized", false);
    router.push("/dashboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-3/4 sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote</DialogTitle>
        </DialogHeader>

        <EventConfigurationForm
          showSetupTeardown={false}
          onOpenInDashboard={handleOpenInDashboard}
          onCancel={closeModal}
        />
      </DialogContent>
    </Dialog>
  );
};
