export type SelectBleacher = {
  bleacher_id: number;
  created_at: string;
  bleacher_number: number;
  home_base_id: number;
  winter_home_base_id: number;
  bleacher_rows: number;
  bleacher_seats: number;
};

export type InsertBleacher = {
  bleacher_number: number;
  home_base_id: number;
  winter_home_base_id: number;
  bleacher_rows: number;
  bleacher_seats: number;
};

export type UpdateBleacher = {
  bleacher_id: number;
  bleacher_number: number;
  home_base_id: number;
  winter_home_base_id: number;
  bleacher_rows: number;
  bleacher_seats: number;
};
