export type QuotesBookingsEvent = {
  id: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  event_status: string | null;
  contract_revenue_cents: number | null;
  created_at: string | null;
  created_by_user_uuid: string | null;
  account_manager_first_name: string | null;
  account_manager_last_name: string | null;
};

export type QuotesBookingsFilters = {
  isOpen: boolean;
  statuses: string[];
  createdFrom: string | null;
  createdTo: string | null;
  eventFrom: string | null;
  eventTo: string | null;
  accountManagerUserUuid: string | null;
};
