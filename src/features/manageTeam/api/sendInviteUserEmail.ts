import { ErrorToast } from "@/components/toasts/ErrorToast";
import React from "react";
import { toast } from "sonner";

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
