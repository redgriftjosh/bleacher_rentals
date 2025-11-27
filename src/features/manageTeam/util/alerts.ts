import { CurrentUserState } from "../state/useCurrentUserStore";

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
    if (state.payRateCents === null || state.payRateCents <= 0) {
      alerts.push("Missing Pay Rate");
    }
  }

  return alerts;
}
