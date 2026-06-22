import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
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

async function insertAddress(address: AddressFields): Promise<string | null> {
  if (!address.street && !address.city && !address.stateProvince) return null;
  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("Addresses")
      .values({
        id,
        street: address.street || null,
        city: address.city || null,
        state_province: address.stateProvince || null,
        zip_postal: address.zipPostal || null,
      })
      .compile(),
  );
  return id;
}

export async function createCompany(params: CreateCompanyParams): Promise<string> {
  try {
    const billingAddressId = await insertAddress(params.billingAddress);
    const shippingAddressId = params.shippingSameAsBilling
      ? billingAddressId
      : await insertAddress(params.shippingAddress);

    const id = crypto.randomUUID();
    await typedExecute(
      db
        .insertInto("Companies")
        .values({
          id,
          company_name: params.companyName,
          phone: params.phone || null,
          email: params.email || null,
          notes: params.notes || null,
          billing_address_uuid: billingAddressId,
          shipping_address_uuid: shippingAddressId,
          deleted: 0,
        })
        .compile(),
    );
    return id;
  } catch (e) {
    createErrorToast(["Failed to create company.", e instanceof Error ? e.message : ""]);
    throw e;
  }
}
