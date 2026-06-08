export type WorkTrackerRow = {
  id: string;
  date: string | null;
  status: string | null;
  pay_cents: number | null;
  pickup_time: string | null;
  dropoff_time: string | null;
  created_at: string | null;
  completed_at: string | null;
  project_number: string | null;
  driver_first_name: string | null;
  driver_last_name: string | null;
  driver_email: string | null;
  driver_uuid: string | null;
  driver_account_manager_uuid: string | null;
  account_manager_first_name: string | null;
  account_manager_last_name: string | null;
  bleacher_number: number | null;
  pickup_street: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  dropoff_street: string | null;
  dropoff_city: string | null;
  dropoff_state: string | null;
};

export type WorkTrackerFilters = {
  isOpen: boolean;
  statuses: string[];
  dateFrom: string | null;
  dateTo: string | null;
  completedFrom: string | null;
  completedTo: string | null;
  driverUuid: string | null;
  accountManagerUuid: string | null;
};
