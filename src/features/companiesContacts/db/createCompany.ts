import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { AddressFields } from "@/features/quotesAndBookings/types/quoteTypes";

type CreateCompanyParams = {
  companyName: string;
  phone: string;
  email: string;
  notes: string;
  billingAddress: AddressFields;
  shippingAddress: AddressFields;
  shippingSameAsBilling: boolean;
};

async function insertAddress(addr: AddressFields): Promise<string | null> {
  if (!addr.street && !addr.city && !addr.stateProvince) return null;
  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("Addresses")
      .values({
        id,
        street: addr.street || null,
        city: addr.city || null,
        state_province: addr.stateProvince || null,
        zip_postal: addr.zipPostal || null,
      })
      .compile(),
  );
  return id;
}

export async function createCompany(params: CreateCompanyParams): Promise<string> {
  try {
    const billingId = await insertAddress(params.billingAddress);
    const shippingId = params.shippingSameAsBilling
      ? billingId
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
          billing_address_uuid: billingId,
          shipping_address_uuid: shippingId,
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
