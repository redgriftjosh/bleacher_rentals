import { Database } from "../../../database.types";

/**
 * An in-memory alert ready to be persisted.
 * entity_uuid may be null while editing a new (unsaved) event;
 * syncEventAlerts always uses its own entityUuid param for the actual insert.
 */
export type AlertEntityType = Database["public"]["Enums"]["alert_entity_type"];

export type AlertPayload = {
  entity_uuid: string | null;
  entity_type: AlertEntityType;
  title: string;
  message: string;
  entity_description: string | null;
};
