"use client";

import { create } from "zustand";
import {
  Currency,
  LineItem,
  PaymentMethod,
  QuoteStatus,
} from "../types/quoteTypes";

export type CreateQuoteState = {
  // Quote Details
  quoteNumber: string;
  quoteStart: string;
  quoteValidTill: string;
  status: QuoteStatus;
  salesOfficeId: string | null;
  accountManagerId: string | null;

  // Client Information
  contactId: string | null;
  contactName: string;
  companyName: string;
  companyEmail: string;
  phone: string;

  // Event Details
  eventName: string;
  eventAddress: string;
  dropArrivalDate: string;
  pickUpDate: string;
  eventStart: string;
  eventEnd: string;

  // Currency
  currency: Currency;

  // Line Items (bleachers, discounts, logistics, custom services — all in one list)
  lineItems: LineItem[];

  // Payment
  paymentMethod: PaymentMethod;

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
};

export type CreateQuoteActions = {
  setField: <K extends keyof CreateQuoteState>(key: K, value: CreateQuoteState[K]) => void;
  addLineItem: (item: LineItem) => void;
  updateLineItem: (id: string, updates: Partial<LineItem>) => void;
  removeLineItem: (id: string) => void;
  resetForm: () => void;
};

const today = new Date().toISOString().split("T")[0];
const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const initialState: CreateQuoteState = {
  quoteNumber: "",
  quoteStart: today,
  quoteValidTill: validTill,
  status: "draft",
  salesOfficeId: null,
  accountManagerId: null,

  contactId: null,
  contactName: "",
  companyName: "",
  companyEmail: "",
  phone: "",

  eventName: "",
  eventAddress: "",
  dropArrivalDate: "",
  pickUpDate: "",
  eventStart: "",
  eventEnd: "",

  currency: "USD",

  lineItems: [],

  paymentMethod: null,

  clientFacingNotes: "",
  internalNotes: "",

  termsDocumentId: null,
  attachPdfViaEmail: false,

  isNewContactModalOpen: false,
  isNewCompanyModalOpen: false,
  isAddLineItemModalOpen: false,
};

export const useCreateQuoteStore = create<CreateQuoteState & CreateQuoteActions>((set) => ({
  ...initialState,

  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  addLineItem: (item) =>
    set((state) => ({ lineItems: [...state.lineItems, item] })),

  updateLineItem: (id, updates) =>
    set((state) => ({
      lineItems: state.lineItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  removeLineItem: (id) =>
    set((state) => ({ lineItems: state.lineItems.filter((i) => i.id !== id) })),

  resetForm: () => set(initialState),
}));
