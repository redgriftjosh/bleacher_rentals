import { column, Schema, Table } from "@powersync/web";
import { PowerSyncColsFor } from "./types";

export const ACCOUNT_MANAGERS_TABLE = "AccountManagers";
export const DRIVERS_TABLE = "Drivers";
export const USERS_TABLE = "Users";
export const WORK_TRACKERS_TABLE = "WorkTrackers";

const AccountManagersCols = {
  created_at: column.text,
  is_active: column.integer,
  user_uuid: column.text,
} satisfies PowerSyncColsFor<"AccountManagers">;
const AccountManagers = new Table(AccountManagersCols, { indexes: { user: ["user_uuid"] } });

const DriversCols = {
  created_at: column.text,
  tax: column.integer,
  pay_rate_cents: column.integer,
  pay_currency: column.text,
  pay_per_unit: column.text,
  is_active: column.integer,
  account_manager_uuid: column.text,
  user_uuid: column.text,
} satisfies PowerSyncColsFor<"Drivers">;
const Drivers = new Table(DriversCols, { indexes: { user: ["user_uuid"] } });

const UsersCols = {
  first_name: column.text,
  last_name: column.text,
  email: column.text,
  phone: column.text,
  clerk_user_id: column.text,
  status: column.integer,
  role: column.integer,
  avatar_image_url: column.text,
  is_admin: column.integer,
  created_at: column.text,
} satisfies PowerSyncColsFor<"Users">;
const Users = new Table(UsersCols);

const WorkTrackersCols = {
  created_at: column.text,
  date: column.text,
  pickup_time: column.text,
  pickup_poc: column.text,
  dropoff_time: column.text,
  dropoff_poc: column.text,
  pay_cents: column.integer,
  notes: column.text,
  internal_notes: column.text,
  pickup_address_uuid: column.text,
  dropoff_address_uuid: column.text,
  bleacher_uuid: column.text,
  driver_uuid: column.text,
  user_uuid: column.text,
} satisfies PowerSyncColsFor<"WorkTrackers">;
const WorkTrackers = new Table(WorkTrackersCols, {
  indexes: { user: ["user_uuid"], driver: ["driver_uuid"] },
});

export const AppSchema = new Schema({
  AccountManagers,
  Drivers,
  Users,
  WorkTrackers,
});

export type PowerSyncDB = (typeof AppSchema)["types"];
export type AccountManagerRecord = PowerSyncDB["AccountManagers"];
export type DriverRecord = PowerSyncDB["Drivers"];
export type UserRecord = PowerSyncDB["Users"];
export type WorkTrackerRecord = PowerSyncDB["WorkTrackers"];
