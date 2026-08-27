/**
 * Platform detection for keyboard-modifier shortcuts.
 *
 * The dashboard's "create work tracker" shortcut is ⌘+click on macOS and Ctrl+click everywhere
 * else. It deliberately does NOT accept Ctrl on macOS: there Ctrl+click is the system
 * secondary-click gesture, so treating it as a shortcut would fire the modal from what the user
 * meant as a right click.
 */

/** Pure form — takes the platform string so it can be unit tested without a browser. */
export function isMacPlatformString(platform: string | null | undefined): boolean {
  return /mac/i.test(platform ?? "");
}

type NavigatorWithUAData = Navigator & {
  userAgentData?: { platform?: string };
};

/**
 * True on macOS (and iPadOS, which reports "MacIntel"). Returns false during SSR.
 *
 * `navigator.platform` is deprecated but still the only value present in every browser we
 * support, so it stays as the fallback behind `userAgentData.platform`.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithUAData;
  return isMacPlatformString(nav.userAgentData?.platform ?? nav.platform);
}

export type ModifierClick = {
  metaKey: boolean;
  ctrlKey: boolean;
  /** Pixi's `FederatedPointerEvent.button`; 0 is the primary button. */
  button: number;
};

/**
 * Whether a pointer event carries the "open a new work tracker" modifier.
 *
 * `isMac` is passed in rather than read here so the rule stays pure and testable; callers use
 * `isMacPlatform()`. `button === 0` keeps the shortcut on the primary button only — a right
 * click that somehow reaches us with a modifier held must never create anything.
 */
export function hasCreateWorkTrackerModifier(event: ModifierClick, isMac: boolean): boolean {
  if (event.button !== 0) return false;
  return isMac ? event.metaKey : event.ctrlKey;
}
