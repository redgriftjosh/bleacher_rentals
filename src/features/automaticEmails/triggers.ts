// Catalog of automatic-email triggers.
//
// Trigger *types* live here in code (not in a DB table): their display name,
// description, recipient, available variables, and recurrence are logic, not
// user-editable data. What IS data is the per-office binding (which template to
// use + whether it's on) — see EmailTriggerBindings.
//
// All triggers are currently sales-office scoped and fire off an event that has
// an eventId, so the send path can resolve everything from the booking.

export type TriggerRecipient = "client" | "account_manager";

export type Recurrence =
  | null // one-shot, fires on the event
  | "every_2d_until_expiry"
  | "every_2d_until_paid";

export type TriggerDef = {
  key: string;
  label: string;
  description: string;
  recipient: TriggerRecipient;
  recurrence: Recurrence;
  // Variable tokens this trigger makes available to its template.
  variables: string[];
  // False = catalogued in the UI but not yet actually sending (phase 2).
  wired: boolean;
};

// Trigger keys (also stored in EmailTriggerBindings.trigger).
export const QUOTE_SENT_CLIENT = "quote_sent_client";
export const QUOTE_SIGNED_CLIENT = "quote_signed_client";
export const QUOTE_SIGNED_AM = "quote_signed_am";
export const PAYMENT_MADE_CLIENT = "payment_made_client";
export const PAYMENT_MADE_AM = "payment_made_am";
// export const PAYMENT_DUE_CLIENT = "payment_due_client";
// export const QUOTE_UNSIGNED_REMINDER = "quote_unsigned_reminder";
// export const PAYMENT_DUE_REMINDER = "payment_due_reminder";

// Variable sets. Event-context tokens shared by all these triggers.
const BASE_VARS = [
  "{{firstName}}",
  "{{customerName}}",
  "{{quoteLink}}",
  "{{quoteNumber}}",
  "{{eventName}}",
  "{{eventStartDate}}",
  "{{total}}",
  "{{accountManager}}",
  "{{companyName}}",
];
const PAYMENT_VARS = [...BASE_VARS, "{{amountPaid}}", "{{amountDue}}", "{{dueDate}}"];

export const TRIGGERS: TriggerDef[] = [
  {
    key: QUOTE_SENT_CLIENT,
    label: "Quote sent — notify client",
    description: "Sent to the client when their quote is manually sent from the admin app.",
    recipient: "client",
    recurrence: null,
    variables: BASE_VARS,
    wired: true,
  },
  {
    key: QUOTE_SIGNED_CLIENT,
    label: "Quote signed — notify client",
    description: "Sent to the client after they sign their quote.",
    recipient: "client",
    recurrence: null,
    variables: BASE_VARS,
    wired: true,
  },
  {
    key: QUOTE_SIGNED_AM,
    label: "Quote signed — notify account manager",
    description: "Sent to the account manager when their client signs.",
    recipient: "account_manager",
    recurrence: null,
    variables: BASE_VARS,
    wired: true,
  },
  {
    key: PAYMENT_MADE_CLIENT,
    label: "Payment made — notify client",
    description: "Sent to the client when a payment is received.",
    recipient: "client",
    recurrence: null,
    variables: PAYMENT_VARS,
    wired: true,
  },
  {
    key: PAYMENT_MADE_AM,
    label: "Payment made — notify account manager",
    description: "Sent to the account manager when their client pays.",
    recipient: "account_manager",
    recurrence: null,
    variables: PAYMENT_VARS,
    wired: true,
  },
  // {
  //   key: PAYMENT_DUE_CLIENT,
  //   label: "Payment due — notify client",
  //   description: "Sent to the client when a payment becomes due.",
  //   recipient: "client",
  //   recurrence: null,
  //   variables: PAYMENT_VARS,
  //   wired: false, // time-based; wired with the phase-2 scheduler
  // },
  // {
  //   key: QUOTE_UNSIGNED_REMINDER,
  //   label: "Unsigned quote reminder",
  //   description: "Reminds the client every 2 days to sign, until the quote expires.",
  //   recipient: "client",
  //   recurrence: "every_2d_until_expiry",
  //   variables: BASE_VARS,
  //   wired: false, // needs the phase-2 scheduler
  // },
  // {
  //   key: PAYMENT_DUE_REMINDER,
  //   label: "Payment due reminder",
  //   description: "Reminds the client every 2 days while a payment is due.",
  //   recipient: "client",
  //   recurrence: "every_2d_until_paid",
  //   variables: PAYMENT_VARS,
  //   wired: false, // needs the phase-2 scheduler
  // },
];

export function getTrigger(key: string): TriggerDef | undefined {
  return TRIGGERS.find((t) => t.key === key);
}
