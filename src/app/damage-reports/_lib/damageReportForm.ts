import type { DamageSeverity } from "./db";

/** Minimum photos a damage report may be saved with. */
export const MIN_PHOTOS = 1;

/**
 * Maximum photos a damage report may hold. Parity with
 * br_driver/utils/photoLimit.ts's MAX_PHOTOS — keep these two values equal.
 */
export const MAX_PHOTOS = 30;

export type DamageReportFormValues = {
  bleacherUuid: string | null;
  /** null = unanswered (no default pre-selected value). */
  seatDamage: DamageSeverity | null;
  /** null = unanswered (no default pre-selected value). */
  haulDamage: DamageSeverity | null;
  note: string;
  /** existingPhotos.length + newPhotoPaths.length, post-removal. */
  photoCount: number;
};

/**
 * Validates a damage report form. Mirrors
 * br_driver/features/damage-report/DamageReportScreen.tsx's submit
 * validation (bleacher required, at least one severity answered, non-empty
 * note, at least one photo) plus the admin-only MAX_PHOTOS ceiling.
 *
 * Returns the first failing rule's user-facing message, or null if the form
 * may submit.
 */
export function validateDamageReportForm(v: DamageReportFormValues): string | null {
  if (!v.bleacherUuid) {
    return "Please select a bleacher.";
  }

  if (v.seatDamage === null && v.haulDamage === null) {
    return "Please select at least one damage severity.";
  }

  if (!v.note.trim()) {
    return "Please add damage notes.";
  }

  if (v.photoCount < MIN_PHOTOS) {
    return "Please add at least one damage photo.";
  }

  if (v.photoCount > MAX_PHOTOS) {
    return `Maximum ${MAX_PHOTOS} photos per report. Remove a photo before adding more.`;
  }

  return null;
}

export type PhotoLimitState = {
  max: number;
  current: number;
  /**
   * How many more photos may be added. Clamped at zero, so a legacy report
   * already over the cap reads as "can't add more" rather than as broken UI.
   * A report over the cap is never blocked from being *saved* — only from
   * having more photos *added* (see validateDamageReportForm, which only
   * rejects photoCount > MAX_PHOTOS on the way in, not on existing data).
   */
  remaining: number;
  atLimit: boolean;
  notice: string | null;
};

/** Everything the UI needs to know about the photo cap for a given count. */
export function describePhotoLimit(current: number): PhotoLimitState {
  const remaining = Math.max(0, MAX_PHOTOS - current);
  const atLimit = remaining === 0;

  return {
    max: MAX_PHOTOS,
    current,
    remaining,
    atLimit,
    notice: atLimit
      ? `Maximum ${MAX_PHOTOS} photos per report. Remove a photo if you need to add a different one.`
      : null,
  };
}
