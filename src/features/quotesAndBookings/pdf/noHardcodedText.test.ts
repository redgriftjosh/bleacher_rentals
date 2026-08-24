import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Guard: no customer-facing text may be hardcoded in a quote surface.
 *
 * Every word a client reads on a quote has to come from pdf/quoteStrings.ts, so
 * that a French quote is French all the way through. This test parses each
 * client-facing file and fails on text that bypasses the dictionary:
 *
 *   <Text>Quote</Text>                     ← JSX text node
 *   <input placeholder="Full name" />      ← user-visible attribute
 *   {signing ? "Signing..." : "Sign"}      ← literal in a rendered expression
 *
 * The fix is always the same: add an entry to quoteStrings.ts and render
 * `{s.yourKey}` instead.
 *
 * See docs/specs/quote-preferred-language.md.
 */

const PDF_DIR = path.resolve(__dirname);
const QUOTE_PAGES_DIR = path.resolve(__dirname, "../../../app/quote");

/** Attributes whose string value is read by a human, not the browser. */
const USER_VISIBLE_ATTRS = new Set([
  "placeholder",
  "title",
  "alt",
  "label",
  "aria-label",
  "aria-placeholder",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
]);

/**
 * Text that is allowed to stay in the markup, with the reason it is exempt.
 * Keep this list short — if you are adding to it, the string probably belongs
 * in quoteStrings.ts instead.
 */
const ALLOWED = new Map<string, string>([
  ["Bleacher Rentals", "company name — a proper noun, identical in both languages"],
  ["EN", "language toggle — an ISO code, identical in every language"],
  ["FR", "language toggle — an ISO code, identical in every language"],
]);

/** Strip HTML entities (&middot;) so their letters don't read as words. */
function withoutEntities(text: string): string {
  return text.replace(/&[a-zA-Z]+;|&#\d+;/g, "");
}

/**
 * Does this string contain actual words a client would read? Punctuation,
 * symbols, separators and entities ("—", "·", "$", "/", "&middot;") do not.
 */
function isDisplayText(raw: string): boolean {
  const text = withoutEntities(raw).trim();
  if (!text || ALLOWED.has(text)) return false;
  return /\p{L}{2,}/u.test(text);
}

type Violation = { file: string; line: number; text: string; kind: string };

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * String and template literals in a position whose value is *rendered*.
 *
 * Descends through the branches of conditionals and `&&` / `??` chains, since
 * any branch can end up on screen. Deliberately does NOT descend into call
 * arguments, object literals or comparison operands — `p.status === "paid"` and
 * `formatMoney(50)` are logic, not copy.
 */
function renderedLiterals(node: ts.Node, found: ts.Node[] = []): ts.Node[] {
  if (ts.isParenthesizedExpression(node)) return renderedLiterals(node.expression, found);

  if (ts.isConditionalExpression(node)) {
    renderedLiterals(node.whenTrue, found);
    renderedLiterals(node.whenFalse, found);
    return found;
  }

  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken
    ) {
      renderedLiterals(node.left, found);
      renderedLiterals(node.right, found);
    }
    return found;
  }

  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateExpression(node)
  ) {
    found.push(node);
  }
  return found;
}

/**
 * The literal *text* of a string or template — never the interpolated code.
 * `` `${data.company.street}, ${data.company.zip}` `` is only ", ": punctuation
 * around data, not copy. Spans are joined with a space so words never merge
 * across a placeholder.
 */
function literalText(node: ts.Node): string {
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return "";
}

function scan(file: string): Violation[] {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: Violation[] = [];
  const relative = path.relative(process.cwd(), file);

  const report = (node: ts.Node, text: string, kind: string) => {
    violations.push({
      file: relative,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      text: text.trim().replace(/\s+/g, " ").slice(0, 60),
      kind,
    });
  };

  const visit = (node: ts.Node) => {
    // <Text>Quote</Text>
    if (ts.isJsxText(node) && isDisplayText(node.text)) {
      report(node, node.text, "JSX text");
    }

    // placeholder="Full name"
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attr = node.name.text;
      const init = node.initializer;
      if (USER_VISIBLE_ATTRS.has(attr) && init) {
        const expr = ts.isJsxExpression(init) ? init.expression : init;
        if (
          expr &&
          (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) &&
          isDisplayText(expr.text)
        ) {
          report(node, `${attr}="${expr.text}"`, "attribute");
        }
      }
    }

    // {signing ? "Signing..." : "Sign Contract"} as a JSX child
    if (ts.isJsxExpression(node) && node.expression && node.parent && isJsxContainer(node.parent)) {
      for (const literal of renderedLiterals(node.expression)) {
        const text = literalText(literal);
        if (isDisplayText(text)) report(literal, text, "expression");
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return violations;
}

function isJsxContainer(node: ts.Node): boolean {
  return ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node);
}

const files = [...collectFiles(PDF_DIR), ...collectFiles(QUOTE_PAGES_DIR)].sort();

describe("client-facing quote surfaces contain no hardcoded text", () => {
  it("finds the files it is supposed to be guarding", () => {
    // Guards the guard: a rename that silently empties this list would make
    // every assertion below pass vacuously.
    const names = files.map((f) => path.basename(f));
    expect(names).toContain("QuotePublicView.tsx");
    expect(names).toContain("QuotePdfDocument.tsx");
    expect(names).toContain("ContractPdfPages.tsx");
    expect(names).toContain("PayInvoiceTab.tsx");
    expect(names).toContain("SignContractTab.tsx");
    expect(files.length).toBeGreaterThanOrEqual(9);
  });

  it.each(files.map((f) => [path.basename(f), f] as const))(
    "%s renders all its text through quoteStrings.ts",
    (_name, file) => {
      const violations = scan(file);
      const message = violations
        .map((v) => `  ${v.file}:${v.line}  [${v.kind}]  ${v.text}`)
        .join("\n");

      expect(
        violations,
        violations.length
          ? `Hardcoded customer-facing text found:\n\n${message}\n\n` +
              `Every word a client reads must come from pdf/quoteStrings.ts, or a French ` +
              `quote will show English here. Add a key with both 'en' and 'fr', then render ` +
              `{s.yourKey}. See docs/specs/quote-preferred-language.md.`
          : undefined,
      ).toEqual([]);
    },
  );
});
