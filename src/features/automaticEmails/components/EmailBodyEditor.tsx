"use client";

import { useMemo, useState } from "react";
import { HtmlCodeEditor } from "./HtmlCodeEditor";
import { renderTemplate, SAMPLE_VALUES, VARIABLE_LABELS } from "../variables";

type Mode = "html" | "preview";

type Props = {
  value: string;
  onChange: (value: string) => void;
  // Variable tokens to offer in the palette. Defaults to all known tokens.
  variables?: string[];
};

async function formatHtml(raw: string): Promise<string> {
  const [prettierMod, htmlMod] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/html"),
  ]);
  // prettier v3 standalone exports named `format`; plugins ship as CJS default
  const prettier = prettierMod.default ?? prettierMod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const htmlPlugin = (htmlMod as any).default ?? htmlMod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prettier as any).format(raw, { parser: "html", plugins: [htmlPlugin] });
}

export function EmailBodyEditor({ value, onChange, variables }: Props) {
  const [mode, setMode] = useState<Mode>("html");
  const [formatting, setFormatting] = useState(false);

  const tokens = variables ?? Object.keys(VARIABLE_LABELS);
  const previewHtml = useMemo(() => renderTemplate(value || "", SAMPLE_VALUES), [value]);

  const insertVariable = (token: string) =>
    onChange(value ? `${value} ${token}` : `<p>${token}</p>`);

  const handleFormat = async () => {
    setFormatting(true);
    try {
      const formatted = await formatHtml(value);
      onChange(formatted);
    } finally {
      setFormatting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Variable palette */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase">Insert variable</label>
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((token) => (
            <button
              key={token}
              type="button"
              title={token}
              onClick={() => insertVariable(token)}
              className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              {VARIABLE_LABELS[token] ?? token}
            </button>
          ))}
        </div>
      </div>

      {/* Mode toggle + format button */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Email body</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFormat}
            disabled={formatting || mode === "preview"}
            className="px-2.5 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {formatting ? "Formatting…" : "Format"}
          </button>
          <div className="inline-flex rounded border border-gray-300 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode("html")}
              className={
                mode === "html"
                  ? "px-2.5 py-1 bg-darkBlue text-white"
                  : "px-2.5 py-1 text-gray-600 hover:bg-gray-50"
              }
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={
                mode === "preview"
                  ? "px-2.5 py-1 bg-darkBlue text-white"
                  : "px-2.5 py-1 text-gray-600 hover:bg-gray-50"
              }
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {mode === "html" ? (
        <HtmlCodeEditor value={value} onChange={onChange} />
      ) : (
        <iframe
          title="Email preview"
          className="w-full h-screen rounded border border-gray-200 bg-white"
          sandbox=""
          srcDoc={previewHtml}
        />
      )}
    </div>
  );
}
