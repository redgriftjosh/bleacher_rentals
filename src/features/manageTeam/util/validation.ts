import { CurrentUserState } from "../state/useCurrentUserStore";

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUserSection(state: CurrentUserState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!state.firstName.trim()) {
    errors.push("First name is required");
  }

  if (!state.lastName.trim()) {
    errors.push("Last name is required");
  }

  if (!state.email.trim()) {
    errors.push("Email is required");
  } else if (!isValidEmail(state.email)) {
    errors.push("Invalid email format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateDriverSection(state: CurrentUserState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Driver validation removed - now handled in UI alerts
  // Drivers can be saved without payment details

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateAccountManagerSection(state: CurrentUserState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Account managers don't have required fields currently
  // But we can add validation if needed in the future

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateForm(state: CurrentUserState): {
  isValid: boolean;
  errors: string[];
} {
  const userValidation = validateUserSection(state);
  const driverValidation = validateDriverSection(state);
  const accountManagerValidation = validateAccountManagerSection(state);

  const allErrors = [
    ...userValidation.errors,
    ...driverValidation.errors,
    ...accountManagerValidation.errors,
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
