"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders changelog markdown.
 *
 * Raw HTML is intentionally NOT enabled (no rehype-raw). Changelog bodies are
 * developer-authored and code-reviewed, but leaving HTML off removes the
 * injection surface entirely — anything HTML-shaped renders as escaped text.
 */
export const ChangeLogMarkdown = ({ body }: { body: string }) => (
  <div className="prose prose-sm max-w-none prose-headings:text-darkBlue prose-a:text-blue-600">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
  </div>
);
