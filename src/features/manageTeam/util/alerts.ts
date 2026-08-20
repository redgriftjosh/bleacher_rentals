import { CurrentUserState } from "../state/useCurrentUserStore";
import { findDriverPayRangeGaps, validateDriverPayRanges } from "../logic/driverPayRanges";

export function calculateUserAlerts(state: CurrentUserState): string[] {
  const alerts: string[] = [];

  if (!state.firstName.trim()) {
    alerts.push("Missing First Name");
  }

  if (!state.lastName.trim()) {
    alerts.push("Missing Last Name");
  }

  if (!state.email.trim()) {
    alerts.push("Missing Email");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    alerts.push("Invalid Email Format");
  }

  if (state.isDriver) {
    const payRangeErrors = validateDriverPayRanges(state.payRanges);

    // The flat rate is what covers anything the ranges don't, so it stays required —
    // unless the ranges leave nothing uncovered: no gaps, and an open-ended top tier.
    const rangesCoverEverything =
      payRangeErrors.length === 0 &&
      state.payRanges.length > 0 &&
      findDriverPayRangeGaps(state.payRanges).length === 0 &&
      state.payRanges.some((range) => range.maxValue === null);

    if ((state.payRateCents === null || state.payRateCents <= 0) && !rangesCoverEverything) {
      alerts.push("Missing Pay Rate");
    }

    if (payRangeErrors.length > 0) {
      alerts.push("Invalid Pay Ranges");
    }
  }

  return alerts;
}
