export const COLUMN_WIDTHS = {
  taskName: 200,
  type: 100,
  status: 100,
};

export const HEADER_CLASSNAME = "px-3 py-1 text-left font-semibold";

export const DEFAULT_TYPE = "236d435a-6e37-4b93-88ab-00be22b36a90";
export const DEFAULT_STATUS = "8e24e3f4-a443-4792-a89d-123924c48321";

// Make sure this matches the Database
export const STATUSES = {
  backlog: "8e24e3f4-a443-4792-a89d-123924c48321",
  approved: "ceaef02a-7f0e-46a2-bdac-bc2999e0de34",
  inProgress: "81459bdb-aad8-40d4-9645-ac4abc22b294",
  paused: "e357f671-e17e-4ba0-b47c-85b446861067",
  inStaging: "e032d388-cd89-4a5e-9e7c-2de25fc857e2",
  complete: "b72e218f-6a71-4259-9403-c1226a47db90",
};

// This is for production user_ids that can edit any task
export const TASK_ADMIN_IDS = ["fb847f63-6088-4089-b62f-fe4aa4abe573"];

export const TASK_TYPES = {
  feature: "236d435a-6e37-4b93-88ab-00be22b36a90",
  bug: "35e4808d-a206-4887-94c2-8ccc9f13264a",
};
