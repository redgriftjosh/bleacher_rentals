"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { useBleacherTypes } from "../../../hooks/useBleacherTypes";
import { usePriceLookup } from "../../../hooks/usePriceLookup";
import {
  DISCOUNT_TEMPLATES,
  LOGISTICS_TEMPLATES,
  CUSTOM_SERVICE_TEMPLATES,
} from "../../../data/mockData";
import { LineItem } from "../../../types/quoteTypes";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function AddLineItemModal() {
  const isOpen = useCreateQuoteStore((s) => s.isAddLineItemModalOpen);
  const currency = useCreateQuoteStore((s) => s.currency);
  const eventTypeId = useCreateQuoteStore((s) => s.eventTypeId);
  const eventStart = useCreateQuoteStore((s) => s.eventStart);
  const eventEnd = useCreateQuoteStore((s) => s.eventEnd);
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const setField = useCreateQuoteStore((s) => s.setField);
  const addLineItem = useCreateQuoteStore((s) => s.addLineItem);

  const { bleacherTypes } = useBleacherTypes();

  const subtotalCents = lineItems
    .filter((i) => i.category !== "discounts")
    .reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
  const { lookupPrice, findDuration } = usePriceLookup();

  const close = () => setField("isAddLineItemModalOpen", false);

  const canLookupPrice = !!eventTypeId && !!eventStart && !!eventEnd;
  const duration = eventStart && eventEnd ? findDuration(eventStart, eventEnd) : null;

  const addBleacher = (bt: { id: string; name: string }) => {
    const priceCents =
      canLookupPrice ? lookupPrice(bt.id, eventTypeId!, eventStart, eventEnd, currency) : null;

    const item: LineItem = {
      id: crypto.randomUUID(),
      category: "bleachers",
      label: bt.name,
      bleacherTypeUuid: bt.id,
      qty: 1,
      unitPriceCents: priceCents ?? 0,
      lineTotalCents: priceCents ?? 0,
      overridePrice: priceCents === null,
      discountType: "percentage",
      discountValue: 0,
    };
    addLineItem(item);
    close();
  };

  const addDiscount = (template: (typeof DISCOUNT_TEMPLATES)[number]) => {
    let lineTotalCents = 0;
    if (template.defaultType === "percentage" && template.defaultValue > 0) {
      lineTotalCents = -Math.round(subtotalCents * (template.defaultValue / 100));
    } else if (template.defaultType === "fixed" && template.defaultValue > 0) {
      lineTotalCents = -Math.abs(template.defaultValue);
    }

    const item: LineItem = {
      id: crypto.randomUUID(),
      category: "discounts",
      label: template.label,
      bleacherTypeUuid: null,
      qty: 1,
      unitPriceCents: 0,
      lineTotalCents,
      overridePrice: false,
      discountType: template.defaultType,
      discountValue: template.defaultValue,
    };
    addLineItem(item);
    close();
  };

  const addService = (
    category: "logistics" | "custom_service",
    template: (typeof LOGISTICS_TEMPLATES)[number],
  ) => {
    const item: LineItem = {
      id: crypto.randomUUID(),
      category,
      label: template.label,
      bleacherTypeUuid: null,
      qty: 1,
      unitPriceCents: template.defaultPriceCents,
      lineTotalCents: template.defaultPriceCents,
      overridePrice: false,
      discountType: "percentage",
      discountValue: 0,
    };
    addLineItem(item);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 mb-2">
          Select a template to add. You can edit all values inline after adding.
        </p>

        <Tabs defaultValue="bleachers">
          <TabsList className="w-full">
            <TabsTrigger value="bleachers">Bleachers</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="custom_service">Custom Service</TabsTrigger>
          </TabsList>

          <TabsContent value="bleachers">
            {!canLookupPrice && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                Set event type and dates to see prices from the pricing matrix.
              </p>
            )}
            <div className="space-y-2 mt-2">
              {bleacherTypes.map((bt) => {
                const priceCents = canLookupPrice
                  ? lookupPrice(bt.id, eventTypeId!, eventStart, eventEnd, currency)
                  : null;

                return (
                  <button
                    key={bt.id}
                    onClick={() => addBleacher(bt)}
                    className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                  >
                    <div>
                      <div className="font-medium text-sm">{bt.name}</div>
                      <div className="text-xs text-gray-500">{bt.rowCount} rows</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {priceCents !== null ? (
                        <div>
                          <span className="font-medium text-gray-700">
                            {formatCents(priceCents, currency)}
                          </span>
                          {duration && (
                            <span className="ml-1 text-gray-400">/ {duration.name}</span>
                          )}
                        </div>
                      ) : canLookupPrice ? (
                        <span className="text-amber-500">No price set</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {bleacherTypes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No bleacher types found in the database.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="discounts">
            <div className="space-y-2 mt-2">
              {DISCOUNT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addDiscount(t)}
                  className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">
                    {t.defaultValue > 0
                      ? t.defaultType === "percentage"
                        ? `${t.defaultValue}%`
                        : formatCents(t.defaultValue, currency)
                      : "Custom"}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logistics">
            <div className="space-y-2 mt-2">
              {LOGISTICS_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addService("logistics", t)}
                  className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">
                    {t.defaultPriceCents > 0
                      ? formatCents(t.defaultPriceCents, currency)
                      : "Enter price"}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom_service">
            <div className="space-y-2 mt-2">
              {CUSTOM_SERVICE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addService("custom_service", t)}
                  className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">
                    {t.defaultPriceCents > 0
                      ? formatCents(t.defaultPriceCents, currency)
                      : "Enter price"}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-2">
          <button
            onClick={close}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
