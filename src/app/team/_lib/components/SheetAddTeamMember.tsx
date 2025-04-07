"use client";
import { useEffect, useState } from "react";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { inviteUser } from "../db";

export function SheetAddTeamMember() {
  const { getToken } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // useEffect to set all back to default
  useEffect(() => {
    if (!isOpen) {
      setEmail(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    if (!email) return;

    const token = await getToken({ template: "supabase" });
    if (!token) {
      console.warn("No token found");
      return;
    }

    try {
      await inviteUser(email, token);
    } catch (error) {
      console.error("Error inviting user:", error);
      return;
    }

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Invitation sent!");
      setEmail("");
    } else {
      setMessage(`Error: ${data.error}`);
    }

    setSubmitting(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-lightBlue transition cursor-pointer"
      >
        + Invite Team Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Invite A New Team Member</h2>
              <p className="text-sm text-gray-500">
                Just type their email and they'll receive an email to join Bleacher Rentals.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email ?? ""}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end">
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 bg-darkBlue text-white rounded-md hover:bg-lightBlue transition-colors cursor-pointer"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
