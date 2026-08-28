import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmDialog } from "./ConfirmDialog";

const noop = () => {};

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    expect(
      renderToStaticMarkup(
        <ConfirmDialog
          open={false}
          title="Delete this feature?"
          onConfirm={noop}
          onCancel={noop}
        />,
      ),
    ).toBe("");
  });

  it("exposes itself as an alert dialog", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Delete this feature?" onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
  });

  it("shows the title and message", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete this feature?"
        message="It can be restored later."
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(html).toContain("Delete this feature?");
    expect(html).toContain("It can be restored later.");
  });

  it("paints a destructive confirm in the danger tone", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Delete?" onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain("text-rm-danger");
  });

  it("paints a non-destructive confirm in the accent tone", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Restore?"
        confirmLabel="Restore"
        destructive={false}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(html).toContain("Restore");
    expect(html).not.toContain("text-rm-danger");
  });

  it("uses custom action labels", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Discard?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(html).toContain("Discard");
    expect(html).toContain("Keep editing");
  });
});
