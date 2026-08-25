import { collectErrors, validateEmail, validateName, validatePhone } from "@/lib/validation/fields";

export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type CompanyFormValues = {
  companyName: string;
  email: string;
  phone: string;
};

export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Shape rules for a contact. Only `firstName` is mandatory — email and phone are
 * optional, but when filled they must actually look like an email / phone number
 * so a name can never end up stored in the phone column.
 */
export function validateContactForm(values: ContactFormValues): FormErrors<ContactFormValues> {
  return collectErrors({
    firstName: validateName(values.firstName, "First name", { required: true }),
    lastName: validateName(values.lastName, "Last name"),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
  });
}

/** Shape rules for a company. Same contract as `validateContactForm`. */
export function validateCompanyForm(values: CompanyFormValues): FormErrors<CompanyFormValues> {
  return collectErrors({
    companyName: validateName(values.companyName, "Company name", { required: true }),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
  });
}

export function hasErrors(errors: FormErrors<unknown>): boolean {
  return Object.keys(errors).length > 0;
}
