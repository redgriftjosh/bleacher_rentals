import { LenientSelections } from "../LenientSelections";
import { Toggle } from "../Toggle";
import React from "react";
import { Dropdown } from "@/components/DropDown";
import { Textarea } from "@/components/TextArea";
import { EventStatus, useCurrentEventStore } from "../../useCurrentEventStore";
import { useAlertTypesStore } from "@/state/alertTypesStore";
import { useEventAlertsStore } from "@/state/eventAlertsStore";
import { CheckCheck } from "lucide-react";

export const AlertsTab = () => {
  const currentEventStore = useCurrentEventStore();
  const alertTypes = useAlertTypesStore((s) => s.alertTypes);
  const eventAlerts = useEventAlertsStore((s) => s.eventAlerts);

  return (
    <div className="min-h-32">
      {currentEventStore.alerts?.length > 0 ? (
        currentEventStore.alerts.map((alert, index) => {
          return (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-red-800 mb-1">{alert}</label>
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex items-center gap-2 text-green-600 font-medium py-2">
          <span>No Alerts! Nicely Done</span>
          <CheckCheck />
        </div>
      )}
    </div>
  );
};
