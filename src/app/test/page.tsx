"use client";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useEffect, useState } from "react";
import { Tables } from "../../../database.types";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Color } from "@/types/Color";

export default function TestPage() {
  const supabase = useClerkSupabaseClient();
  const [entries, setEntries] = useState<Tables<"TestTable">[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEntries = async () => {
    const { data, error } = await supabase.from("TestTable").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching entries:", error);
    } else {
      setEntries(data || []);
    }
  };

  const addEntry = async () => {
    if (!newEntry.trim()) return;
    
    setLoading(true);
    const { error } = await supabase.from("TestTable").insert({ entry: newEntry });

    if (error) {
      console.error("Error adding entry:", error);
    } else {
      setNewEntry("");
      await fetchEntries();
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl text-darkBlue font-bold mb-2">Test Page</h1>
        <p className="text-sm mb-6" style={{ color: Color.GRAY }}>
          Testing Supabase connection with TestTable
        </p>

        {/* Add Entry Form */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
              placeholder="Enter something..."
              className="flex-1 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
            />
            <PrimaryButton onClick={addEntry} loading={loading} loadingText="Adding...">
              Add Entry
            </PrimaryButton>
          </div>
        </div>

        {/* Entries List */}
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100">
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left font-semibold">ID</th>
                <th className="p-3 text-left font-semibold">Entry</th>
                <th className="p-3 text-left font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">
                    No entries yet. Add one above!
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.test_table_id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="p-3">{entry.test_table_id}</td>
                    <td className="p-3">{entry.entry}</td>
                    <td className="p-3 text-gray-500 text-sm">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
