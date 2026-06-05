export type QuotesBookingsEvent = {
  id: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  event_status: string | null;
  contract_revenue_cents: number | null;
  created_at: string | null;
  booked_at: string | null;
  created_by_user_uuid: string | null;
  account_manager_first_name: string | null;
  account_manager_last_name: string | null;
  account_manager_email: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  company_name: string | null;
};

export type QuotesBookingsFilters = {
  isOpen: boolean;
  statuses: string[];
  createdFrom: string | null;
  createdTo: string | null;
  eventFrom: string | null;
  eventTo: string | null;
  bookedFrom: string | null;
  bookedTo: string | null;
  accountManagerUserUuid: string | null;
};
