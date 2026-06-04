"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuoteDetail, fetchQuoteDetail } from "../../db/fetchQuoteDetail";
import { softDeleteEvent } from "../../db/softDeleteEvent";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { ContractTab } from "./tabs/ContractTab";
import { BillingTab } from "./tabs/BillingTab";
import { FilesTab } from "./tabs/FilesTab";
import { LogTab } from "./tabs/LogTab";

function formatCurrency(cents: number | null): string {
  if (cents === null) return "$0.00";
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function QuoteDetailView({ eventId }: { eventId: string }) {
  const router = useRouter();
  const supabase = useClerkSupabaseClient();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this quote? This action can be undone by an admin.")) return;
    setDeleting(true);
    const ok = await softDeleteEvent(eventId, supabase);
    if (ok) {
      createSuccessToast(["Quote deleted."]);
      router.push("/quotes-bookings");
    }
    setDeleting(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchQuoteDetail(eventId)
      .then(setQuote)
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading quote...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500">Quote not found</p>
        <button
          onClick={() => router.push("/quotes-bookings")}
          className="text-sm text-darkBlue underline cursor-pointer"
        >
          Back to Quotes & Bookings
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-darkBlue text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
          <button
            onClick={() => router.push("/quotes-bookings")}
            className="hover:text-white transition cursor-pointer"
          >
            Quotes & Bookings
          </button>
          <span>/</span>
          {quote.contact && (
            <>
              <span>
                {quote.contact.firstName} {quote.contact.lastName ?? ""}
              </span>
              <span>/</span>
            </>
          )}
          <span className="text-white/80">{quote.eventName}</span>
        </div>
        <h1 className="text-xl font-bold">
          {quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName ?? ""} — ` : ""}
          {quote.eventName}
        </h1>
      </div>

      {/* Tab bar + actions */}
      <Tabs defaultValue="contract" className="gap-0">
        <div className="border-b bg-white px-6 flex items-center justify-between">
          <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
            <TabsTrigger
              value="contract"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-darkBlue data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              Contract
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-darkBlue data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-darkBlue data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="log"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-darkBlue data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              Log
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 py-2">
            <span className="text-sm font-bold">{formatCurrency(quote.contractRevenueCents)}</span>
            <span className="text-xs text-gray-500">Contract Total</span>
            <button
              onClick={() => router.push(`/quotes-bookings/${quote.id}/edit`)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-sm hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button className="text-xs text-gray-500 hover:text-gray-700 transition cursor-pointer underline">
              Add Quote Expiration
            </button>
            <button className="px-3 py-1.5 text-sm font-semibold text-white bg-darkBlue rounded-sm hover:bg-lightBlue transition cursor-pointer">
              Send To Client
            </button>
          </div>
        </div>

        <div className="bg-white px-6 py-6 rounded-b-lg border border-t-0">
          <TabsContent value="contract">
            <ContractTab quote={quote} />
          </TabsContent>
          <TabsContent value="billing">
            <BillingTab quote={quote} />
          </TabsContent>
          <TabsContent value="files">
            <FilesTab quoteId={quote.id} />
          </TabsContent>
          <TabsContent value="log">
            <LogTab quote={quote} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
