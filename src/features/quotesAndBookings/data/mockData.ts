import { LineItemTemplate } from "../types/quoteTypes";

export const BLEACHER_TEMPLATES: LineItemTemplate[] = [
  {
    bleacherType: "7_row",
    label: "7 Row Bleacher",
    seats: 149,
    rates: { rural: 3100, city: 4200, corporate: 5000 },
  },
  {
    bleacherType: "10_row",
    label: "10 Row Bleacher",
    seats: 350,
    rates: { rural: 5500, city: 7200, corporate: 9000 },
  },
  {
    bleacherType: "15_row",
    label: "15 Row Bleacher",
    seats: 750,
    rates: { rural: 8100, city: 10500, corporate: 13000 },
  },
];

export const DISCOUNT_TEMPLATES = [
  { id: "multi_event", label: "Multi-Event Discount", defaultPercent: 10 },
  { id: "repeat_client", label: "Repeat Client Discount", defaultPercent: 5 },
  { id: "early_booking", label: "Early Booking Discount", defaultPercent: 8 },
  { id: "custom_discount", label: "Custom Discount", defaultPercent: 0 },
];

export const LOGISTICS_TEMPLATES = [
  { id: "drop_off", label: "Drop Off", defaultPrice: 650 },
  { id: "pick_up", label: "Pick Up", defaultPrice: 650 },
  { id: "rush_delivery", label: "Rush Delivery", defaultPrice: 1200 },
  { id: "overtime_labor", label: "Overtime Labor", defaultPrice: 500 },
];

export const CUSTOM_SERVICE_TEMPLATES = [
  { id: "setup_crew", label: "Setup Crew", defaultPrice: 800 },
  { id: "teardown_crew", label: "Teardown Crew", defaultPrice: 800 },
  { id: "on_site_manager", label: "On-Site Manager", defaultPrice: 1500 },
  { id: "custom", label: "Custom Service", defaultPrice: 0 },
];

export const RATE_TYPE_LABELS: Record<string, string> = {
  rural: "Rural",
  city: "City",
  corporate: "Corporate",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Credit Card",
  physical_check: "Physical Check",
  wire_ach: "Wire / ACH",
  cash: "Cash",
};

export const SALES_OFFICES_MOCK = [
  { id: "1", name: "Main Office" },
  { id: "2", name: "West Coast Office" },
  { id: "3", name: "East Coast Office" },
];

export const DEFAULT_TAX_RATE = 8;
