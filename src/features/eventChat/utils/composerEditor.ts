import type { ChatEligibleUser } from "../hooks/useChatEligibleUsers";
import { splitMessageBody } from "./mentions";

const MENTION_SPAN_CLASS =
  "rounded-sm bg-[#E8F5FA] text-[#1264A3] font-semibold";

/** Plain text from a contenteditable composer (mention chips count as their visible text). */
export function serializeEditor(root: HTMLElement): string {
  let result = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? "";
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    if (node.dataset.mentionUuid) {
      result += node.textContent ?? "";
      return;
    }

    if (node.tagName === "BR") {
      result += "\n";
      return;
    }

    node.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return result;
}

function nodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0;
  }

  if (node instanceof HTMLElement) {
    if (node.dataset.mentionUuid) {
      return node.textContent?.length ?? 0;
    }

    if (node.tagName === "BR") return 1;

    let length = 0;
    node.childNodes.forEach((child) => {
      length += nodeTextLength(child);
    });
    return length;
  }

  return 0;
}

/** Cursor offset in serialized plain text. */
export function getSelectionOffset(root: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const { anchorNode, anchorOffset } = selection;
  if (!anchorNode || !root.contains(anchorNode)) return 0;

  let offset = 0;
  let found = false;

  const walk = (node: Node): boolean => {
    if (found) return true;

    if (node === anchorNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += anchorOffset;
      } else if (node instanceof HTMLElement) {
        for (let i = 0; i < anchorOffset; i++) {
          offset += nodeTextLength(node.childNodes[i]!);
        }
      }
      found = true;
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
      return false;
    }

    if (node instanceof HTMLElement) {
      if (node.dataset.mentionUuid) {
        offset += node.textContent?.length ?? 0;
        return false;
      }

      if (node.tagName === "BR") {
        offset += 1;
        return false;
      }

      for (const child of node.childNodes) {
        if (walk(child)) return true;
      }
    }

    return false;
  };

  for (const child of root.childNodes) {
    if (walk(child)) break;
  }

  return offset;
}

/** Restore cursor from a serialized plain-text offset. */
export function setSelectionOffset(root: HTMLElement, targetOffset: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  const serializedLength = serializeEditor(root).length;
  if (targetOffset >= serializedLength) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  let remaining = targetOffset;

  const placeAtEndOfNode = (node: Node) => {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
      remaining -= length;
      return false;
    }

    if (node instanceof HTMLElement) {
      if (node.dataset.mentionUuid) {
        const length = node.textContent?.length ?? 0;
        if (remaining < length) {
          // Can't place the caret inside a non-editable mention chip.
          const range = document.createRange();
          range.setStartBefore(node);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        if (remaining === length) {
          placeAtEndOfNode(node);
          return true;
        }
        remaining -= length;
        return false;
      }

      if (node.tagName === "BR") {
        if (remaining === 0) {
          const range = document.createRange();
          range.setStartBefore(node);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        if (remaining === 1) {
          placeAtEndOfNode(node);
          return true;
        }
        remaining -= 1;
        return false;
      }

      for (const child of node.childNodes) {
        if (walk(child)) return true;
      }
    }

    return false;
  };

  for (const child of root.childNodes) {
    if (walk(child)) return;
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function appendTextWithNewlines(root: HTMLElement, text: string): void {
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (line) {
      root.appendChild(document.createTextNode(line));
    }
    if (index < lines.length - 1) {
      root.appendChild(document.createElement("br"));
    }
  });
}

/** Rebuild editor DOM from plain text — used after mention insert or external reset. */
export function renderPlainTextToEditor(
  root: HTMLElement,
  text: string,
  members: ChatEligibleUser[],
): void {
  root.innerHTML = "";
  if (!text) return;

  for (const part of splitMessageBody(text, members)) {
    if (part.type === "text") {
      appendTextWithNewlines(root, part.value);
      continue;
    }

    const span = document.createElement("span");
    span.contentEditable = "false";
    span.dataset.mentionUuid = part.userUuid;
    span.className = MENTION_SPAN_CLASS;
    span.textContent = part.value;
    root.appendChild(span);
  }
}
