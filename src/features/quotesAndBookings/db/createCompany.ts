import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { AddressFields } from "../types/quoteTypes";
import { createErrorToast } from "@/components/toasts/ErrorToast";

type CreateCompanyParams = {
  companyName: string;
  phone: string;
  email: string;
  notes: string;
  billingAddress: AddressFields;
  shippingAddress: AddressFields;
  shippingSameAsBilling: boolean;
};

async function insertAddress(
  address: AddressFields,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  if (!address.street && !address.city && !address.stateProvince) {
    return null;
  }

  const newAddress: TablesInsert<"Addresses"> = {
    street: address.street,
    city: address.city,
    state_province: address.stateProvince,
    zip_postal: address.zipPostal || null,
  };

  const { data, error } = await supabase
    .from("Addresses")
    .insert(newAddress)
    .select("id")
    .single();

  if (error || !data) {
    createErrorToast(["Failed to insert address.", error?.message ?? ""]);
  }

  return data!.id;
}

export async function createCompany(
  params: CreateCompanyParams,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  // 1. Insert billing address
  const billingAddressId = await insertAddress(params.billingAddress, supabase);

  // 2. Insert shipping address (or reuse billing)
  let shippingAddressId: string | null = null;
  if (params.shippingSameAsBilling) {
    shippingAddressId = billingAddressId;
  } else {
    shippingAddressId = await insertAddress(params.shippingAddress, supabase);
  }

  // 3. Insert company
  const newCompany: TablesInsert<"Companies"> = {
    company_name: params.companyName,
    phone: params.phone || null,
    email: params.email || null,
    notes: params.notes || null,
    billing_address_uuid: billingAddressId,
    shipping_address_uuid: shippingAddressId,
  };

  const { data, error } = await supabase
    .from("Companies")
    .insert(newCompany)
    .select("id")
    .single();

  if (error || !data) {
    createErrorToast(["Failed to create company.", error?.message ?? ""]);
  }

  return data!.id;
}
