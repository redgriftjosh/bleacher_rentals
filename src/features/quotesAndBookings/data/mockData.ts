import { DiscountTemplate, ServiceTemplate } from "../types/quoteTypes";

export const DISCOUNT_TEMPLATES: DiscountTemplate[] = [
  { id: "referral", label: "Referral Discount", defaultType: "fixed", defaultValue: 10000 },
  { id: "bleacher_sponsor", label: "Bleacher Sponsor", defaultType: "fixed", defaultValue: 10000 },
  { id: "loyal_customer", label: "Loyal Customer Discount", defaultType: "fixed", defaultValue: 10000 },
  { id: "layover", label: "Layover Discount", defaultType: "percentage", defaultValue: 50 },
  { id: "long_term_rental", label: "Long Term Rental", defaultType: "percentage", defaultValue: 50 },
  { id: "custom_discount", label: "Custom Discount", defaultType: "fixed", defaultValue: 0 },
];

export const LOGISTICS_TEMPLATES: ServiceTemplate[] = [
  { id: "delivery", label: "Delivery", defaultPriceCents: 0 },
  { id: "pick_up", label: "Pick Up", defaultPriceCents: 0 },
  { id: "premium_cleaning", label: "Premium Cleaning", defaultPriceCents: 40000 },
  { id: "additional_charges_indoor", label: "Additional Charges (Indoor/Corporate)", defaultPriceCents: 25000 },
];

export const CUSTOM_SERVICE_TEMPLATES: ServiceTemplate[] = [
  { id: "onsite_setup_staff", label: "On-Site Setup Staff", defaultPriceCents: 120000 },
  { id: "setup_crew", label: "Setup Crew", defaultPriceCents: 80000 },
  { id: "teardown_crew", label: "Teardown Crew", defaultPriceCents: 80000 },
  { id: "custom_service", label: "Custom Service", defaultPriceCents: 0 },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Credit Card",
  physical_check: "Physical Check",
  wire_ach: "Wire / ACH",
  cash: "Cash",
};

export const DEFAULT_TAX_RATE = 8;
