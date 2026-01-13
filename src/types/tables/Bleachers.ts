export type SelectBleacher = {
  id: string;
  created_at: string;
  bleacher_number: number;
  summer_home_base_uuid: string;
  winter_home_base_uuid: string;
  bleacher_rows: number;
  bleacher_seats: number;
  linxup_device_id: string | null;
  summer_account_manager_uuid: string | null;
  winter_account_manager_uuid: string | null;
};

export type InsertBleacher = {
  bleacher_number: number;
  summer_home_base_uuid: string;
  winter_home_base_uuid: string;
  bleacher_rows: number;
  bleacher_seats: number;
  linxup_device_id?: string | null;
  summer_account_manager_uuid?: string | null;
  winter_account_manager_uuid?: string | null;
};

export type UpdateBleacher = {
  id: string;
  bleacher_number: number;
  summer_home_base_uuid: string;
  winter_home_base_uuid: string;
  bleacher_rows: number;
  bleacher_seats: number;
  linxup_device_id?: string | null;
  summer_account_manager_uuid?: string | null;
  winter_account_manager_uuid?: string | null;
};
