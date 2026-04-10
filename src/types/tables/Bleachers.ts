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
  hitch_type: string | null;
  vin_number: string | null;
  tag_number: string | null;
  manufacturer: string | null;
  gvwr: number | null;
  trailer_height_in: number | null;
  trailer_length_in: number | null;
  opening_direction: "driver" | "passenger" | null;
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
  hitch_type?: string | null;
  vin_number?: string | null;
  tag_number?: string | null;
  manufacturer?: string | null;
  gvwr?: number | null;
  trailer_height_in?: number | null;
  trailer_length_in?: number | null;
  opening_direction?: "driver" | "passenger" | null;
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
  hitch_type?: string | null;
  vin_number?: string | null;
  tag_number?: string | null;
  manufacturer?: string | null;
  gvwr?: number | null;
  trailer_height_in?: number | null;
  trailer_length_in?: number | null;
  opening_direction?: "driver" | "passenger" | null;
};
