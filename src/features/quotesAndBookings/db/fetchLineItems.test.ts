import { describe, it, expect } from "vitest";
import { inferCategory } from "./fetchLineItems";

describe("inferCategory", () => {
  it('returns "bleachers" when bleacher_type_uuid is present', () => {
    expect(
      inferCategory({
        id: "1",
        header: "10-row",
        bleacher_type_uuid: "uuid-123",
        quantity: 2,
        value_cents: 5000,
      }),
    ).toBe("bleachers");
  });

  it('returns "discounts" when value_cents is negative', () => {
    expect(
      inferCategory({
        id: "2",
        header: "Discount",
        bleacher_type_uuid: null,
        quantity: 1,
        value_cents: -1000,
      }),
    ).toBe("discounts");
  });

  it('returns "custom_service" for positive value without bleacher uuid', () => {
    expect(
      inferCategory({
        id: "3",
        header: "Delivery",
        bleacher_type_uuid: null,
        quantity: 1,
        value_cents: 3000,
      }),
    ).toBe("custom_service");
  });

  it('returns "custom_service" when value_cents is zero', () => {
    expect(
      inferCategory({
        id: "4",
        header: "Free item",
        bleacher_type_uuid: null,
        quantity: 1,
        value_cents: 0,
      }),
    ).toBe("custom_service");
  });

  it('returns "custom_service" when value_cents is null', () => {
    expect(
      inferCategory({
        id: "5",
        header: "Item",
        bleacher_type_uuid: null,
        quantity: null,
        value_cents: null,
      }),
    ).toBe("custom_service");
  });

  it('prioritizes "bleachers" over negative value', () => {
    expect(
      inferCategory({
        id: "6",
        header: "Weird row",
        bleacher_type_uuid: "uuid-456",
        quantity: 1,
        value_cents: -500,
      }),
    ).toBe("bleachers");
  });
});
