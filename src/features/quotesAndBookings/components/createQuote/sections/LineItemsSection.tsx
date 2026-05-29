"use client";

import { X } from "lucide-react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { BLEACHER_TEMPLATES, RATE_TYPE_LABELS } from "../../../data/mockData";
import { Dropdown } from "@/components/DropDown";
import { RateType, LineItem, DiscountType } from "../../../types/quoteTypes";
import { formatCurrency } from "../../../utils/formatCurrency";

const rateOptions = (Object.keys(RATE_TYPE_LABELS) as RateType[]).map((key) => ({
  label: RATE_TYPE_LABELS[key],
  value: key,
}));

const discountTypeOptions = [
  { label: "%", value: "percentage" as DiscountType },
  { label: "$", value: "fixed" as DiscountType },
];

const CATEGORY_LABELS: Record<string, string> = {
  bleachers: "Bleachers",
  discounts: "Discounts",
  logistics: "Logistics",
  custom_service: "Services",
};

function recalcLineTotal(item: LineItem, subtotalForDiscounts: number): number {
  if (item.category === "discounts") {
    if (item.discountType === "percentage") {
      return -(subtotalForDiscounts * (item.discountValue / 100));
    }
    return -Math.abs(item.discountValue);
  }
  return item.unitPrice * item.qty * item.days;
}

export function LineItemsSection() {
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const currency = useCreateQuoteStore((s) => s.currency);
  const updateLineItem = useCreateQuoteStore((s) => s.updateLineItem);
  const removeLineItem = useCreateQuoteStore((s) => s.removeLineItem);
  const setField = useCreateQuoteStore((s) => s.setField);

  const subtotalForDiscounts = lineItems
    .filter((i) => i.category !== "discounts")
    .reduce((sum, i) => sum + i.unitPrice * i.qty * i.days, 0);

  const handleUpdate = (id: string, changes: Partial<LineItem>) => {
    const item = lineItems.find((i) => i.id === id);
    if (!item) return;

    const updated = { ...item, ...changes };

    if (changes.rateType && item.bleacherType) {
      const template = BLEACHER_TEMPLATES.find((t) => t.bleacherType === item.bleacherType);
      if (template) {
        updated.unitPrice = template.rates[changes.rateType as RateType];
      }
    }

    updated.lineTotal = recalcLineTotal(updated, subtotalForDiscounts);
    updateLineItem(id, updated);
  };

  const grouped = lineItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, LineItem[]>,
  );

  const categoryOrder = ["bleachers", "logistics", "custom_service", "discounts"];

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Line Items
      </h2>

      {lineItems.length === 0 ? (
        <p className="py-4 text-center text-gray-400 text-sm border-t border-b">
          No line items added yet
        </p>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;

            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Item</th>
                      {cat === "bleachers" && (
                        <>
                          <th className="pb-2 font-medium w-16 text-center">Qty</th>
                          <th className="pb-2 font-medium w-16 text-center">Days</th>
                          <th className="pb-2 font-medium w-28">Rate Type</th>
                          <th className="pb-2 font-medium w-24 text-right">Unit Price</th>
                        </>
                      )}
                      {(cat === "logistics" || cat === "custom_service") && (
                        <>
                          <th className="pb-2 font-medium w-16 text-center">Qty</th>
                          <th className="pb-2 font-medium w-24 text-right">Unit Price</th>
                        </>
                      )}
                      {cat === "discounts" && (
                        <>
                          <th className="pb-2 font-medium w-20">Type</th>
                          <th className="pb-2 font-medium w-24 text-right">Value</th>
                        </>
                      )}
                      <th className="pb-2 font-medium w-28 text-right">Total</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleUpdate(item.id, { label: e.target.value })}
                            className="w-full h-8 px-2 border rounded text-sm"
                          />
                        </td>

                        {cat === "bleachers" && (
                          <>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) =>
                                  handleUpdate(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                                }
                                className="w-full h-8 px-2 border rounded text-sm text-center"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min={1}
                                value={item.days}
                                onChange={(e) =>
                                  handleUpdate(item.id, { days: Math.max(1, parseInt(e.target.value) || 1) })
                                }
                                className="w-full h-8 px-2 border rounded text-sm text-center"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <Dropdown
                                options={rateOptions}
                                selected={item.rateType}
                                onSelect={(val) => handleUpdate(item.id, { rateType: val })}
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full h-8 px-2 border rounded text-sm text-right"
                              />
                            </td>
                          </>
                        )}

                        {(cat === "logistics" || cat === "custom_service") && (
                          <>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) =>
                                  handleUpdate(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                                }
                                className="w-full h-8 px-2 border rounded text-sm text-center"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full h-8 px-2 border rounded text-sm text-right"
                              />
                            </td>
                          </>
                        )}

                        {cat === "discounts" && (
                          <>
                            <td className="py-2 px-1">
                              <Dropdown
                                options={discountTypeOptions}
                                selected={item.discountType}
                                onSelect={(val) => handleUpdate(item.id, { discountType: val })}
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.discountValue}
                                onChange={(e) =>
                                  handleUpdate(item.id, { discountValue: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full h-8 px-2 border rounded text-sm text-right"
                              />
                            </td>
                          </>
                        )}

                        <td className="py-2 pl-2 text-right font-medium whitespace-nowrap">
                          {formatCurrency(item.lineTotal, currency)}
                        </td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-gray-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setField("isAddLineItemModalOpen", true)}
        className="mt-4 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm px-3 py-1.5 hover:bg-blue-50 transition cursor-pointer"
      >
        + Add Line Item
      </button>
    </section>
  );
}
