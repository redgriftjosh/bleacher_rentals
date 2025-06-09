"use client";

import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import {
  EventStatus,
  useCurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { Dropdown } from "@/components/DropDown";
import BleacherRequirementItem from "../_lib/requirements/BleacherRequirementItem";
import { Textarea } from "@/components/TextArea";
import NewBleacherRequirementButton from "../_lib/requirements/NewBleacherRequirementButton";

export default function RequirementsPage() {
  const currentEventStore = useCurrentEventStore();

  return (
    <main>
      <h1 className="font-bold text-darkBlue text-2xl mb-2 mt-4">Details</h1>
      <div className="flex gap-2">
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700">Event Name</label>
          <input
            type="text"
            className="w-full p-2 max-h-9.5 border rounded-sm"
            placeholder="Enter event name"
            value={currentEventStore.eventName}
            onChange={(e) => currentEventStore.setField("eventName", e.target.value)}
          />
        </div>
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <AddressAutocomplete
            onAddressSelect={(data) =>
              currentEventStore.setField("addressData", {
                ...data,
                addressId: currentEventStore.addressData?.addressId ?? null,
              })
            }
            initialValue={currentEventStore.addressData?.address || ""}
          />
        </div>
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <Dropdown
            options={[
              { label: "Quoted", value: "Quoted" },
              { label: "Booked", value: "Booked" },
            ]}
            selected={currentEventStore.selectedStatus}
            onSelect={(e) => currentEventStore.setField("selectedStatus", e as EventStatus)}
            placeholder="Pick status"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <Textarea
          placeholder="Type your message here."
          value={currentEventStore.notes}
          onChange={(e) => currentEventStore.setField("notes", e.target.value)}
        />
      </div>

      <h1 className="font-bold text-darkBlue text-2xl mb-2 mt-4">Bleacher Requirements</h1>
      {currentEventStore.bleacherRequirements.map((requirement, index) => (
        <BleacherRequirementItem key={index} requirement={requirement} index={index} />
      ))}
      <NewBleacherRequirementButton />
    </main>
  );
}
