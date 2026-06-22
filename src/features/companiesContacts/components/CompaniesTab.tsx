"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { useCompaniesAll } from "../hooks/useCompaniesAll";
import { filterCompanies } from "../utils/searchFilter";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { CompanyDetailModal } from "./CompanyDetailModal";
import type { CompanyFull } from "../hooks/useCompaniesAll";

export function CompaniesTab() {
  const { companies, isLoading } = useCompaniesAll();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CompanyFull | null>(null);

  const filtered = useMemo(() => filterCompanies(companies, query), [companies, query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies..."
            className="bg-gray-100 rounded-full h-8 pl-8 pr-4 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-400/30 placeholder:text-gray-400 w-56 transition-all"
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Company
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          {query ? "No companies match your search." : "No companies yet."}
        </p>
      ) : (
        <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((company) => (
                <tr
                  key={company.id}
                  onClick={() => setSelected(company)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{company.companyName}</td>
                  <td className="px-4 py-3 text-gray-500">{company.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{company.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCompanyModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <CompanyDetailModal company={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
