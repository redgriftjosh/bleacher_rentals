import type { SearchableSelectOption } from "@/components/SearchableSelect";
import type { PocDirection, PocResolution } from "./resolvePocContact";

/** The subset of a contact the POC field needs. Structurally satisfied by `ContactFull`. */
export type PocContact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyUuid: string | null;
  companyName: string | null;
};

export type PocValue = {
  contactUuid: string | null;
  pocText: string | null;
};

export type PocPopulateOutcome =
  | { kind: "apply"; value: PocValue }
  | { kind: "error"; messages: string[] };

const isBlank = (value: string | null | undefined): boolean => (value ?? "").trim() === "";

export function contactDisplayName(contact: PocContact): string {
  return `${contact.firstName} ${contact.lastName ?? ""}`.trim();
}

export function buildPocContactOptions(contacts: PocContact[]): SearchableSelectOption[] {
  return contacts.map((contact) => {
    const name = contactDisplayName(contact);
    return {
      value: contact.id,
      label: contact.email ? `${name} — ${contact.email}` : name,
      // Findable by the things a dispatcher actually remembers, not just the name.
      searchValue: `${contact.email ?? ""} ${contact.phone ?? ""} ${contact.companyName ?? ""}`,
    };
  });
}

/**
 * What the closed select shows. Null means "empty — show the placeholder".
 *
 * A linked contact wins and is read live, so a rename is reflected here even though the stored
 * text is deliberately frozen (see the Bill of Lading rationale in the spec). Free text is the
 * fallback for both legacy rows and a contact that has since been soft-deleted.
 */
export function resolvePocTriggerLabel(
  contactUuid: string | null,
  pocText: string | null,
  contacts: PocContact[],
): string | null {
  if (contactUuid) {
    const linked = contacts.find((contact) => contact.id === contactUuid);
    if (linked) return contactDisplayName(linked);
  }

  return isBlank(pocText) ? null : pocText!.trim();
}

/**
 * Turn a resolver result into what the button should do.
 *
 * The `unlinked` branch is the reason this is not a plain null check: the driver's mobile app
 * dials the POC through the `Contacts` record, so copying a bare name forward would hand over a
 * number-less contact. Refusing with the name in the message tells the user exactly which
 * neighbour to fix.
 */
export function describePocPopulateResult(
  resolution: PocResolution,
  direction: PocDirection,
): PocPopulateOutcome {
  const neighbour = direction === "past" ? "previous event" : "next event";

  if (!resolution) {
    return { kind: "error", messages: [`No contact found on the ${neighbour}.`] };
  }

  if (resolution.kind === "unlinked") {
    return {
      kind: "error",
      messages: [
        `Cannot populate from the ${neighbour}.`,
        `Its POC ("${resolution.displayName}") is free text with no contact record. Create a contact for it first.`,
      ],
    };
  }

  return {
    kind: "apply",
    value: { contactUuid: resolution.contactUuid, pocText: resolution.displayName },
  };
}
