"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";

const industryOptions = [
  { label: "Entertainment", value: "entertainment" },
  { label: "Sports", value: "sports" },
  { label: "Education", value: "education" },
  { label: "Government", value: "government" },
  { label: "Corporate", value: "corporate" },
  { label: "Non-Profit", value: "non_profit" },
  { label: "Other", value: "other" },
];

const companySizeOptions = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
  { label: "Enterprise", value: "enterprise" },
];

export function NewCompanyModal() {
  const isOpen = useCreateQuoteStore((s) => s.isNewCompanyModalOpen);
  const setField = useCreateQuoteStore((s) => s.setField);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const resetAndClose = () => {
    setName("");
    setIndustry(null);
    setCompanySize(null);
    setWebsite("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNote("");
    setField("isNewCompanyModalOpen", false);
  };

  const handleSave = () => {
    setField("companyName", name);
    setField("companyEmail", email);
    console.log("Save Company:", { name, industry, companySize, website, email, phone, address, note });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Company</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              General Information
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Live Nation Entertainment"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <Dropdown
                  options={industryOptions}
                  selected={industry}
                  onSelect={setIndustry}
                  placeholder="Entertainment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                <Dropdown
                  options={companySizeOptions}
                  selected={companySize}
                  onSelect={setCompanySize}
                  placeholder="Enterprise"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.livenation.com"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@livenation.com"
                  className="w-full h-[40px] px-3 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (310) 867-7000"
                  className="w-full h-[40px] px-3 border rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="9348 Civic Center Dr"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VIP client, always prioritize..."
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
            disabled={!name}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-sm shadow-md hover:bg-red-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Company
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
