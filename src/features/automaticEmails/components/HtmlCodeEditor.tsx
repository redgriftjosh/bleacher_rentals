"use client";

import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";

type Props = {
  value: string;
  onChange: (value: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function HtmlCodeEditor({ value, onChange }: Props) {
  return (
    <div className="rounded border border-gray-300 overflow-hidden text-xs">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[html()]}
        theme={oneDark}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: true,
        }}
        height="100vh"
        style={{ fontSize: "12px" }}
      />
    </div>
  );
}
