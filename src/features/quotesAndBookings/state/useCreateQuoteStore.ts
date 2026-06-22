"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AddressFields,
  Currency,
  LineItem,
  PaymentInstallment,
  PaymentMethod,
  QuoteStatus,
} from "../types/quoteTypes";

export type CreateQuoteState = {
  // Edit mode
  editingEventId: string | null;

  // Quote Details
  quoteNumber: string;
  quoteValidTill: string;
  status: QuoteStatus;
  salesOfficeId: string | null;
  accountManagerId: string | null;
  ownerUserUuid: string | null;

  // Client Information
  contactId: string | null;
  contactName: string;
  companyName: string;
  companyEmail: string;
  phone: string;
  useFinanceContact: boolean;
  financeContactId: string | null;
  financeContactEmail: string;

  // Event Details
  eventName: string;
  eventAddress: string;
  eventAddressData: AddressFields | null;
  eventStart: string;
  eventEnd: string;
  eventTypeId: string | null;

  // Currency
  currency: Currency;

  // Tax (auto-calculated from QBO, or manually overridden)
  taxPercent: number | null;
  taxLoading: boolean;
  taxOverrideCents: number | null;

  // Line Items (bleachers, discounts, logistics, custom services — all in one list)
  lineItems: LineItem[];

  // Payment
  paymentMethod: PaymentMethod;
  paymentInstallments: PaymentInstallment[];

  // Notes
  clientFacingNotes: string;
  internalNotes: string;

  // Terms & Send
  termsDocumentId: string | null;
  attachPdfViaEmail: boolean;

  // Modals
  isNewContactModalOpen: boolean;
  isNewCompanyModalOpen: boolean;
  isAddLineItemModalOpen: boolean;
  isEditPaymentScheduleModalOpen: boolean;
};

export type CreateQuoteActions = {
  setField: <K extends keyof CreateQuoteState>(key: K, value: CreateQuoteState[K]) => void;
  addLineItem: (item: LineItem) => void;
  updateLineItem: (id: string, updates: Partial<LineItem>) => void;
  removeLineItem: (id: string) => void;
  setPaymentInstallments: (installments: PaymentInstallment[]) => void;
  resetForm: () => void;
};

const initialState: CreateQuoteState = {
  editingEventId: null,

  quoteNumber: "",
  quoteValidTill: "",
  status: "draft",
  salesOfficeId: null,
  accountManagerId: null,
  ownerUserUuid: null,

  contactId: null,
  contactName: "",
  companyName: "",
  companyEmail: "",
  phone: "",
  useFinanceContact: false,
  financeContactId: null,
  financeContactEmail: "",

  eventName: "",
  eventAddress: "",
  eventAddressData: null,
  eventStart: "",
  eventEnd: "",
  eventTypeId: null,

  currency: "USD",

  taxPercent: null,
  taxLoading: false,
  taxOverrideCents: null,

  lineItems: [],

  paymentMethod: null,
  paymentInstallments: [],

  clientFacingNotes: "",
  internalNotes: "",

  termsDocumentId: null,
  attachPdfViaEmail: false,

  isNewContactModalOpen: false,
  isNewCompanyModalOpen: false,
  isAddLineItemModalOpen: false,
  isEditPaymentScheduleModalOpen: false,
};

function throttledStorage(delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: string | null = null;
  const KEY = "create-quote-draft";

  return {
    getItem: (name: string) => {
      const raw = localStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    },
    setItem: (name: string, value: unknown) => {
      pending = JSON.stringify(value);
      if (!timer) {
        timer = setTimeout(() => {
          if (pending !== null) localStorage.setItem(name, pending);
          pending = null;
          timer = null;
        }, delay);
      }
    },
    removeItem: (name: string) => {
      if (timer) { clearTimeout(timer); timer = null; }
      localStorage.removeItem(name);
    },
  };
}

export const useCreateQuoteStore = create<CreateQuoteState & CreateQuoteActions>()(
  persist(
    (set) => ({
      ...initialState,

      setField: (key, value) => set((state) => ({ ...state, [key]: value })),

      addLineItem: (item) => set((state) => ({ lineItems: [...state.lineItems, item] })),

      updateLineItem: (id, updates) =>
        set((state) => ({
          lineItems: state.lineItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      removeLineItem: (id) =>
        set((state) => ({ lineItems: state.lineItems.filter((i) => i.id !== id) })),

      setPaymentInstallments: (installments) => set({ paymentInstallments: installments }),

      resetForm: () => set(initialState),
    }),
    { name: "create-quote-draft", storage: throttledStorage(1000) },
  ),
);

const TRACKED_KEYS: (keyof CreateQuoteState)[] = [
  "eventName",
  "eventStart",
  "eventEnd",
  "contactId",
  "salesOfficeId",
  "lineItems",
  "paymentInstallments",
  "clientFacingNotes",
  "internalNotes",
  "termsDocumentId",
];

export function hasUnsavedChanges(): boolean {
  const state = useCreateQuoteStore.getState();
  for (const key of TRACKED_KEYS) {
    const current = state[key];
    const initial = initialState[key];
    if (typeof current === "string" && typeof initial === "string") {
      if (current !== initial) return true;
    } else if (Array.isArray(current) && Array.isArray(initial)) {
      if (current.length !== initial.length) return true;
    } else if (current !== initial) {
      return true;
    }
  }
  return false;
}
