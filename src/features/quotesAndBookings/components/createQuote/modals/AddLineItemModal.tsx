"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import {
  BLEACHER_TEMPLATES,
  DISCOUNT_TEMPLATES,
  LOGISTICS_TEMPLATES,
  CUSTOM_SERVICE_TEMPLATES,
} from "../../../data/mockData";
import { LineItem, RateType } from "../../../types/quoteTypes";
import { formatCurrency } from "../../../utils/formatCurrency";

export function AddLineItemModal() {
  const isOpen = useCreateQuoteStore((s) => s.isAddLineItemModalOpen);
  const currency = useCreateQuoteStore((s) => s.currency);
  const setField = useCreateQuoteStore((s) => s.setField);
  const addLineItem = useCreateQuoteStore((s) => s.addLineItem);

  const close = () => setField("isAddLineItemModalOpen", false);

  const addBleacher = (template: (typeof BLEACHER_TEMPLATES)[number]) => {
    const defaultRate: RateType = "city";
    const item: LineItem = {
      id: crypto.randomUUID(),
      category: "bleachers",
      label: template.label,
      bleacherType: template.bleacherType,
      qty: 1,
      days: 1,
      rateType: defaultRate,
      unitPrice: template.rates[defaultRate],
      lineTotal: template.rates[defaultRate],
      overridePrice: false,
      discountType: "percentage",
      discountValue: 0,
    };
    addLineItem(item);
    close();
  };

  const addDiscount = (template: (typeof DISCOUNT_TEMPLATES)[number]) => {
    const item: LineItem = {
      id: crypto.randomUUID(),
      category: "discounts",
      label: template.label,
      bleacherType: null,
      qty: 1,
      days: 1,
      rateType: "city",
      unitPrice: 0,
      lineTotal: 0,
      overridePrice: false,
      discountType: template.defaultPercent > 0 ? "percentage" : "fixed",
      discountValue: template.defaultPercent,
    };
    addLineItem(item);
    close();
  };

  const addLogistics = (template: (typeof LOGISTICS_TEMPLATES)[number]) => {
    const item: LineItem = {
      id: crypto.randomUUID(),
      category: "logistics",
      label: template.label,
      bleacherType: null,
      qty: 1,
      days: 1,
      rateType: "city",
      unitPrice: template.defaultPrice,
      lineTotal: template.defaultPrice,
      overridePrice: false,
      discountType: "percentage",
      discountValue: 0,
    };
    addLineItem(item);
    close();
  };

  const addCustomService = (template: (typeof CUSTOM_SERVICE_TEMPLATES)[number]) => {
    const item: LineItem = {
      id: crypto.randomUUID(),
      category: "custom_service",
      label: template.label,
      bleacherType: null,
      qty: 1,
      days: 1,
      rateType: "city",
      unitPrice: template.defaultPrice,
      lineTotal: template.defaultPrice,
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
            <div className="space-y-2 mt-2">
              {BLEACHER_TEMPLATES.map((t) => (
                <button
                  key={t.bleacherType}
                  onClick={() => addBleacher(t)}
                  className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.seats} seats</div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Rural: {formatCurrency(t.rates.rural, currency)}</div>
                    <div>City: {formatCurrency(t.rates.city, currency)}</div>
                    <div>Corporate: {formatCurrency(t.rates.corporate, currency)}</div>
                  </div>
                </button>
              ))}
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
                  {t.defaultPercent > 0 && (
                    <div className="text-xs text-gray-500">Default: {t.defaultPercent}%</div>
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logistics">
            <div className="space-y-2 mt-2">
              {LOGISTICS_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addLogistics(t)}
                  className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(t.defaultPrice, currency)}</div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom_service">
            <div className="space-y-2 mt-2">
              {CUSTOM_SERVICE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addCustomService(t)}
                  className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  {t.defaultPrice > 0 && (
                    <div className="text-xs text-gray-500">{formatCurrency(t.defaultPrice, currency)}</div>
                  )}
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
