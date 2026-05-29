"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { ContactMethod } from "../../../types/quoteTypes";

export function NewContactModal() {
  const isOpen = useCreateQuoteStore((s) => s.isNewContactModalOpen);
  const setField = useCreateQuoteStore((s) => s.setField);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [preferredMethod, setPreferredMethod] = useState<ContactMethod>("email");
  const [notes, setNotes] = useState("");

  const resetAndClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setRole("");
    setCompanySearch("");
    setPreferredMethod("email");
    setNotes("");
    setField("isNewContactModalOpen", false);
  };

  const handleSave = () => {
    setField("contactName", `${firstName} ${lastName}`.trim());
    setField("companyEmail", email);
    setField("phone", phone);
    setField("companyName", companySearch);
    console.log("Save Contact:", { firstName, lastName, email, phone, jobTitle, role, companySearch, preferredMethod, notes });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Event Coordinator"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Decision Maker"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies..."
                className="flex-1 h-[40px] px-3 border rounded text-sm"
              />
              <button
                onClick={() => setField("isNewCompanyModalOpen", true)}
                className="h-[40px] px-3 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm hover:bg-blue-50 transition cursor-pointer whitespace-nowrap"
              >
                + New Company
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Contact Method
            </label>
            <div className="flex gap-6">
              {(["email", "phone", "text"] as ContactMethod[]).map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    checked={preferredMethod === method}
                    onChange={() => setPreferredMethod(method)}
                    className="accent-darkBlue"
                  />
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about contact..."
              rows={3}
              className="w-full px-3 py-2 border rounded text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!firstName || !lastName || !email}
            className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Contact
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
