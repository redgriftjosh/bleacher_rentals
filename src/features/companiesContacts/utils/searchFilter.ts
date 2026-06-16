export type CompanyFilterRow = {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
};

export type ContactFilterRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
};

export function filterCompanies<T extends CompanyFilterRow>(rows: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (c) =>
      c.companyName.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q),
  );
}

export function filterContacts<T extends ContactFilterRow>(rows: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (c) =>
      `${c.firstName} ${c.lastName ?? ""}`.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.companyName ?? "").toLowerCase().includes(q),
  );
}
