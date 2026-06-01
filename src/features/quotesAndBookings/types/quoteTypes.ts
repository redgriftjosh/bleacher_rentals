export type RateType = "rural" | "city" | "corporate";

export type BleacherType = "7_row" | "10_row" | "15_row";

export type PaymentMethod = "credit_card" | "physical_check" | "wire_ach" | "cash" | null;

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

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

// Matches public."Addresses" table
export type AddressFields = {
  street: string;
  city: string;
  stateProvince: string;
  zipPostal: string;
};

// Matches public."Companies" table
export type QuoteCompany = {
  id: string | null;
  companyName: string;
  phone: string;
  email: string;
  notes: string;
  billingAddress: AddressFields;
  shippingAddress: AddressFields;
  shippingSameAsBilling: boolean;
};

// Matches public."Contacts" table
export type QuoteContact = {
  id: string | null;
  companyUuid: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
};

export type PaymentInstallmentStatus = "unpaid" | "paid";

export type PaymentInstallment = {
  id: string;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
  status: PaymentInstallmentStatus;
};

export type LineItemTemplate = {
  bleacherType: BleacherType;
  label: string;
  seats: number;
  rates: Record<RateType, number>;
};
