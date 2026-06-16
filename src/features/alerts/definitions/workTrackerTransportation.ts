import { AlertDefinition } from "../types";
import { findLastKnownLocation, resolveStreet } from "../util/findLastKnownLocation";

export const workTrackerTransportation: AlertDefinition = {
  title: "Pickup Location Mismatch",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, supabase) {
    const { data: wt } = await supabase
      .from("WorkTrackers")
      .select("id, bleacher_uuid, date, pickup_address_uuid, Bleachers(bleacher_number)")
      .eq("id", workTrackerUuid)
      .single();

    if (!wt?.bleacher_uuid || !wt.date || !wt.pickup_address_uuid) return null;

    const lastLocation = await findLastKnownLocation(wt.bleacher_uuid, wt.date, supabase);
    if (!lastLocation) return null;

    const lastStreet = await resolveStreet(lastLocation.addressUuid, supabase);
    const pickupStreet = await resolveStreet(wt.pickup_address_uuid, supabase);

    if (!lastStreet || !pickupStreet || lastStreet === pickupStreet) return null;

    const bleacherNum =
      wt.Bleachers && !Array.isArray(wt.Bleachers) ? wt.Bleachers.bleacher_number : null;
    const desc = bleacherNum != null ? `Bleacher #${bleacherNum}` : "Work Tracker";

    return {
      message: `Bleacher is at ${lastStreet}, but pickup is set to ${pickupStreet}.`,
      entityDescription: desc,
    };
  },

  async recipients(workTrackerUuid, supabase) {
    const { data } = await supabase
      .from("WorkTrackers")
      .select("created_by_user_uuid")
      .eq("id", workTrackerUuid)
      .single();
    return data?.created_by_user_uuid ? [data.created_by_user_uuid] : [];
  },
};
