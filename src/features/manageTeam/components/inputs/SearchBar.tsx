"use client";
import { useSearchQueryStore } from "@/features/manageTeam/state/useSearchQueryStore";
import { Search, X } from "lucide-react";

export default function SearchBar() {
  const searchQuery = useSearchQueryStore((s) => s.searchQuery);
  const setField = useSearchQueryStore((s) => s.setField);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
      <input
        type="text"
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setField("searchQuery", e.target.value)}
        className="pl-10 pr-10 py-2 text-sm border border-gray-300 bg-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-darkBlue focus:border-transparent transition w-64"
      />
      {searchQuery && (
        <button
          onClick={() => setField("searchQuery", "")}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
