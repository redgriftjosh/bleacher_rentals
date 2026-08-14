"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseLoomEmbedUrl } from "../util/loomEmbed";

/**
 * Renders changelog markdown.
 *
 * Raw HTML is intentionally NOT enabled (no rehype-raw). Changelog bodies are
 * developer-authored and code-reviewed, but leaving HTML off removes the
 * injection surface entirely — anything HTML-shaped renders as escaped text.
 *
 * Video and images therefore go in as plain markdown:
 *
 * - a Loom **link** on its own becomes an inline player
 *   `[Watch the walkthrough](https://www.loom.com/share/<id>)`
 * - an **image** is normal markdown pointing at `public/`
 *   `![Pay ranges on the driver page](/changelog/1.2.0-pay-ranges.png)`
 */
export const ChangeLogMarkdown = ({ body }: { body: string }) => (
  <div className="prose prose-sm max-w-none prose-headings:text-darkBlue prose-a:text-blue-600">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children, ...props }) {
          const embed = href ? parseLoomEmbedUrl(href) : null;

          if (!embed) {
            return (
              <a href={href} {...props}>
                {children}
              </a>
            );
          }

          // A <span> rather than a <div>: markdown puts links inside a <p>, and a
          // block-level child there is invalid HTML that React will complain about.
          return (
            <span className="my-4 block aspect-video w-full overflow-hidden rounded-lg border border-gray-200">
              <iframe
                src={embed}
                title={typeof children === "string" ? children : "Loom video"}
                className="h-full w-full"
                allowFullScreen
                loading="lazy"
              />
            </span>
          );
        },
        img({ src, alt, ...props }) {
          if (typeof src !== "string") return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ""}
              loading="lazy"
              className="my-4 max-w-full rounded-lg border border-gray-200"
              {...props}
            />
          );
        },
      }}
    >
      {body}
    </ReactMarkdown>
  </div>
);
