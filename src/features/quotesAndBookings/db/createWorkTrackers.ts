import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";

type CreateWorkTrackersParams = {
  dropArrivalDate: string;
  pickUpDate: string;
  addressUuid: string;
};

/**
 * Creates two WorkTrackers for a quote:
 * 1. Drop-off — deliver bleachers to event address
 * 2. Pick-up — pick up bleachers from event address
 */
export async function createQuoteWorkTrackers(
  params: CreateWorkTrackersParams,
  supabase: SupabaseClient<Database>,
): Promise<{ dropOffId: string | null; pickUpId: string | null }> {
  let dropOffId: string | null = null;
  let pickUpId: string | null = null;

  // 1. Drop-off WorkTracker (delivery to event)
  if (params.dropArrivalDate) {
    const dropOff: TablesInsert<"WorkTrackers"> = {
      date: params.dropArrivalDate,
      dropoff_address_uuid: params.addressUuid,
      // user_uuid is auto-filled by DB default
      status: "draft",
      setup_required: false,
      teardown_required: false,
    };

    const { data, error } = await supabase
      .from("WorkTrackers")
      .insert(dropOff)
      .select("id")
      .single();

    if (error || !data) {
      createErrorToast(["Failed to create drop-off work tracker.", error?.message ?? ""]);
    }

    dropOffId = data!.id;
  }

  // 2. Pick-up WorkTracker (pick up from event)
  if (params.pickUpDate) {
    const pickUp: TablesInsert<"WorkTrackers"> = {
      date: params.pickUpDate,
      pickup_address_uuid: params.addressUuid,
      // user_uuid is auto-filled by DB default
      status: "draft",
      setup_required: false,
      teardown_required: false,
    };

    const { data, error } = await supabase
      .from("WorkTrackers")
      .insert(pickUp)
      .select("id")
      .single();

    if (error || !data) {
      createErrorToast(["Failed to create pick-up work tracker.", error?.message ?? ""]);
    }

    pickUpId = data!.id;
  }

  return { dropOffId, pickUpId };
}
