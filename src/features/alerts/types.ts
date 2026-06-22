import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

export type AlertEntityType = Database["public"]["Enums"]["alert_entity_type"];

export type AlertPayload = {
  entity_uuid: string | null;
  entity_type: AlertEntityType;
  title: string;
  message: string;
  entity_description: string | null;
};

export type AlertResult = {
  message: string;
  entityDescription: string | null;
};

export type AlertDefinition = {
  title: string;
  entityType: AlertEntityType;
  evaluate: (
    entityUuid: string,
    supabase: SupabaseClient<Database>,
  ) => Promise<AlertResult | null>;
  evaluateInMemory?: (context: InMemoryAlertContext) => AlertPayload[];
  recipients: (
    entityUuid: string,
    supabase: SupabaseClient<Database>,
  ) => Promise<string[]>;
};

export type InMemoryAlertContext = {
  event: import("@/features/eventConfiguration/state/useCurrentEventStore").CurrentEventState;
  allEvents: import("../../../database.types").Tables<"Events">[];
  allBleacherEvents: import("../../../database.types").Tables<"BleacherEvents">[];
  allWorkTrackers: import("../../../database.types").Tables<"WorkTrackers">[];
  allBleachers: import("../../../database.types").Tables<"Bleachers">[];
  allAddresses: import("../../../database.types").Tables<"Addresses">[];
};
