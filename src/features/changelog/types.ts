export type ChangeLogEntry = {
  id: string;
  version: string;
  /** ISO string — timestamps come back from the local DB as text. */
  released_at: string;
  body_md: string;
};
