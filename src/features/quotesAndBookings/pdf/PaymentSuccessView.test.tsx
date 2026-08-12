import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentSuccessView } from "./PaymentSuccessView";

const render = (eventUUID: string) =>
  renderToStaticMarkup(<PaymentSuccessView eventUUID={eventUUID} />);

describe("PaymentSuccessView", () => {
  it("tells the customer the payment succeeded and a receipt is on the way", () => {
    const html = render("evt-uuid-123");
    expect(html).toContain("Payment Successful!");
    expect(html).toContain("Thank you for your payment. You will receive a receipt in your email");
  });

  it("links back to that event's quote page, and only that page", () => {
    const html = render("evt-uuid-123");
    expect(html).toContain('href="/quote/evt-uuid-123"');
    // Regression guard: this page must not offer any other destination
    // (no dashboard link, no pay-again link, etc).
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});
