"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { QuoteDocumentData } from "./quoteDocumentData";
import { QuotePublicView } from "./QuotePublicView";
import { SignContractTab } from "./SignContractTab";
import { PayInvoiceTab } from "./PayInvoiceTab";
import { useQuoteActivityTracker } from "./useQuoteActivityTracker";
import { useQuoteFreshness } from "./useQuoteFreshness";
import { usePresenceCheck } from "./usePresenceCheck";
import { QuoteUpdatedModal } from "./QuoteUpdatedModal";
import { StillHereModal } from "./StillHereModal";

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
  const { isStale, refresh } = useQuoteFreshness(data.eventId, data.contentHash);
  const { promptPresence, confirmPresent } = usePresenceCheck();
  // Set when the sign endpoint rejects with 409 (quote changed at sign time).
  const [signConflict, setSignConflict] = useState(false);
  const quoteChanged = isStale || signConflict;

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
      {/* Staleness wins over presence: refreshing also proves the client is here. */}
      <QuoteUpdatedModal open={quoteChanged} onRefresh={refresh} />
      <StillHereModal open={promptPresence && !quoteChanged} onConfirm={confirmPresent} />

      {/* Tab bar — sticky on all sizes so the 3 steps stay reachable on mobile */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm sm:shadow-none pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-0">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 sm:pt-6">
          <div className="flex sm:border-b">
            {TABS.map((tab, i) => {
              const isActive = activeTab === tab.key;
              const isPast =
                (tab.key === "quote" && (activeTab === "contract" || activeTab === "pay")) ||
                (tab.key === "contract" && activeTab === "pay");

              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm font-semibold sm:font-medium border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? "border-[#405daa] text-[#405daa]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span
                    className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      isActive || isPast ? "bg-[#405daa] text-white" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isPast ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="text-center leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content — all tabs stay mounted to preserve state */}
      <div className={activeTab === "quote" ? undefined : "hidden"}>
        <QuotePublicView data={data} track={track} />
      </div>
      <div className={activeTab === "contract" ? undefined : "hidden"}>
        <SignContractTab data={data} track={track} onQuoteChanged={() => setSignConflict(true)} />
      </div>
      <div className={activeTab === "pay" ? undefined : "hidden"}>
        <PayInvoiceTab data={data} track={track} />
      </div>
    </div>
  );
}
