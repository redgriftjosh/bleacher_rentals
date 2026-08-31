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

  it("gives a destructive confirm a solid danger button", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Delete?" onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain("bg-rm-danger");
  });

  it("gives a non-destructive confirm the brand button instead", () => {
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
    expect(html).not.toContain("bg-rm-danger");
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

describe("ConfirmDialog — structure", () => {
  it("describes itself to assistive tech via the title and message", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete this feature?"
        message="It can be restored later."
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(html).toContain("aria-labelledby");
    expect(html).toContain("aria-describedby");
  });

  it("omits aria-describedby when there is no message to point at", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Delete?" onConfirm={noop} onCancel={noop} />,
    );
    expect(html).not.toContain("aria-describedby");
  });

  it("hides the decorative warning icon from screen readers", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Delete?" onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain('aria-hidden="true"');
  });
});
