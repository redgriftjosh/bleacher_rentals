export type RateType = "rural" | "city" | "corporate";

export type BleacherType = "7_row" | "10_row" | "15_row";

export type PaymentMethod = "credit_card" | "physical_check" | "wire_ach" | "cash" | null;

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export type ContactMethod = "email" | "phone" | "text";

export type LineItemCategory = "bleachers" | "discounts" | "logistics" | "custom_service";

export type DiscountType = "percentage" | "fixed";

export type Currency = "USD" | "CAD";

export type LineItem = {
  id: string;
  category: LineItemCategory;
  label: string;
  bleacherType: BleacherType | null;
  qty: number;
  days: number;
  rateType: RateType;
  unitPrice: number;
  lineTotal: number;
  overridePrice: boolean;
  discountType: DiscountType;
  discountValue: number;
};

export type QuoteContact = {
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: string;
  companyId: string | null;
  companyName: string;
  preferredContactMethod: ContactMethod;
  notes: string;
};

export type QuoteCompany = {
  id: string | null;
  name: string;
  industry: string;
  companySize: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  note: string;
};

export type LineItemTemplate = {
  bleacherType: BleacherType;
  label: string;
  seats: number;
  rates: Record<RateType, number>;
};
