import { ErrorToast } from "@/components/toasts/ErrorToast";
import React from "react";
import { toast } from "sonner";
import { ROLES } from "./constants";
import { Tables } from "../../../../database.types";
import { ExistingUser } from "../page";

export function checkInsertUserFormRules(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
  roleId: number | null,
  homeBaseIds: number[],
  existingEmails: string[],
  token: string | null,
  isUpdating: boolean
): boolean {
  // check if all required fields are filled in
  let errors = [];
  if (!token) {
    errors.push(
      "Missing: JWT Token. Please let Josh Redgrift (josh@tpi-3.ca) know you saw this message, refresh your page and try again."
    );
  }
  if (!roleId) {
    errors.push("Missing: Role");
  }
  if (!firstName) {
    errors.push("Missing: First Name");
  }
  if (!lastName) {
    errors.push("Missing: Last Name");
  }
  if (firstName?.trim() === "") {
    errors.push("Invalid: First Name");
  }
  if (lastName?.trim() === "") {
    errors.push("Invalid: Last Name");
  }
  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!email) {
    errors.push("Missing: Email");
  } else if (!emailRegex.test(email)) {
    errors.push("Invalid: Email");
  } else if (existingEmails.includes(email.toLowerCase()) && !isUpdating) {
    errors.push("Email already exists");
  }

  if (firstName && firstName.length > 50) {
    errors.push("First Name is too long");
  }
  if (lastName && lastName.length > 50) {
    errors.push("Last Name is too long");
  }
  if (email && email.length > 100) {
    errors.push("Email is too long");
  }
  if (roleId === ROLES.accountManager && homeBaseIds.length === 0) {
    errors.push("Must assign to at least one Home Base");
  }

  if (errors.length > 0) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: errors,
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    return false;
  } else {
    return true;
  }
}

export function checkEmailRules(email: string | null, existingEmails: string[]): boolean {
  // check if all required fields are filled in
  let errors = [];
  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!email) {
    errors.push("Missing: Email");
  } else if (!emailRegex.test(email)) {
    errors.push("Invalid: Email");
  }

  if (errors.length > 0) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: errors,
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    return false;
  } else {
    return true;
  }
}

export async function sendInviteUserEmail(email: string): Promise<boolean> {
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (res.ok) {
    return true;
  } else {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [
            "Error Sending Invite. Please notify Josh Redgrift (josh@tpi-3.ca) if the problem persists.",
            data.error,
          ],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    return false;
  }
}

export async function deleteInviteUserEmail(email: string): Promise<boolean> {
  const res = await fetch("/api/invite", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (res.ok) {
    return true;
  } else {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [
            "Error Revoking Invite. Please notify Josh Redgrift (josh@tpi-3.ca) if the problem persists.",
            data.error,
          ],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    return false;
  }
}

export function filterUserRoles(
  userRoles: Tables<"UserRoles">[],
  existingUser: ExistingUser | null
): Tables<"UserRoles">[] {
  if (!existingUser) return userRoles;
  if (existingUser.role === ROLES.driver) {
    return userRoles.filter((ur) => ur.id === ROLES.driver);
  } else {
    return userRoles.filter((ur) => ur.id !== ROLES.driver);
  }
}
