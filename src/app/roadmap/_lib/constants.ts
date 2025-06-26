export const COLUMN_WIDTHS = {
  taskName: 200,
  type: 100,
  status: 100,
};

export const HEADER_CLASSNAME = "px-3 py-1 text-left font-semibold";

export const DEFAULT_TYPE = 1;
export const DEFAULT_STATUS = 1;

// Make sure this matches the Database
export const STATUSES = {
  backlog: 1,
  approved: 2,
  inProgress: 3,
  paused: 4,
  inStaging: 5,
  complete: 6,
};

// This is for production user_ids that can edit any task
export const TASK_ADMIN_IDS = [1, 8];

export const TASK_TYPES = { feature: 1, bug: 2 };
