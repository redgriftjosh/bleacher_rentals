"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { QuoteDocumentData } from "./quoteDocumentData";
import { QuotePublicView } from "./QuotePublicView";
import { SignContractTab } from "./SignContractTab";
import { PayInvoiceTab } from "./PayInvoiceTab";
import { useQuoteActivityTracker } from "./useQuoteActivityTracker";

type Tab = "quote" | "contract" | "pay";

const TABS: { key: Tab; label: string }[] = [
  { key: "quote", label: "Approved Quote" },
  { key: "contract", label: "Signed Contract" },
  { key: "pay", label: "Pay Invoice" },
];

const TAB_LABELS: Record<Tab, string> = {
  quote: "Approved Quote",
  contract: "Signed Contract",
  pay: "Pay Invoice",
};

export function QuotePublicTabs({ data }: { data: QuoteDocumentData }) {
  const [activeTab, setActiveTab] = useState<Tab>("quote");
  const track = useQuoteActivityTracker(data.eventId);

  useEffect(() => {
    track({ action_type: "client_page_view", next_value: data.quoteNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTabChange(tab: Tab) {
    if (tab === activeTab) return;
    track({
      action_type: "client_tab_change",
      field_name: "tab",
      prev_value: TAB_LABELS[activeTab],
      next_value: TAB_LABELS[tab],
    });
    setActiveTab(tab);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex border-b">
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.key;
            const isPast =
              (tab.key === "quote" && (activeTab === "contract" || activeTab === "pay")) ||
              (tab.key === "contract" && activeTab === "pay");

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isPast
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isPast ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — all tabs stay mounted to preserve state */}
      <div className={activeTab === "quote" ? undefined : "hidden"}>
        <QuotePublicView data={data} track={track} />
      </div>
      <div className={activeTab === "contract" ? undefined : "hidden"}>
        <SignContractTab data={data} track={track} />
      </div>
      <div className={activeTab === "pay" ? undefined : "hidden"}>
        <PayInvoiceTab data={data} track={track} />
      </div>
    </div>
  );
}
