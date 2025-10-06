import { X } from "lucide-react";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useUser } from "@clerk/nextjs";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useUsersStore } from "@/state/userStore";

export const CreateEventButton = () => {
  const currentEventStore = useCurrentEventStore();
  const { user } = useUser();
  const users = useUsersStore((s) => s.users);

  const resolveCurrentUserId = () => {
    const metaId = user?.publicMetadata?.user_id as string | number | undefined;
    if (metaId !== undefined && metaId !== null) {
      const num = typeof metaId === "string" ? parseInt(metaId, 10) : metaId;
      if (!Number.isNaN(num)) return num as number;
    }
    const clerkId = user?.id;
    if (clerkId) {
      const match = users.find((u) => u.clerk_user_id === clerkId);
      if (match) return match.user_id;
    }
    return null;
  };

  return currentEventStore.isFormExpanded ? (
    <button
      onClick={() => {
        // Collapse form: clear owner and reset form state
        currentEventStore.setField("isFormExpanded", false);
        currentEventStore.resetForm();
        useCurrentEventStore.getState().setField("ownerUserId", null);
      }}
      className="px-2 py-2 bg-transparent font-light rounded mb-2 hover:bg-gray-100 hover:border-darkBlue border-transparent border transition text-gray-500 hover:text-darkBlue text-3xl cursor-pointer"
    >
      <X />
    </button>
  ) : (
    // <button
    //   onClick={() => {
    //     currentEventStore.setField("isFormExpanded", !currentEventStore.isFormExpanded);
    //   }}
    //   className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded h-[40px] mb-2 shadow-md hover:bg-lightBlue transition cursor-pointer"
    // >
    //   Configure Event
    // </button>
    <div className="-pt-2 pb-2">
      <PrimaryButton
        onClick={() => {
          currentEventStore.setField("isFormExpanded", !currentEventStore.isFormExpanded);
          if (!currentEventStore.ownerUserId) {
            const resolved = resolveCurrentUserId();
            if (resolved) {
              useCurrentEventStore.getState().setField("ownerUserId", resolved);
            }
          }
        }}
      >
        Configure Event
      </PrimaryButton>
    </div>
  );
};
