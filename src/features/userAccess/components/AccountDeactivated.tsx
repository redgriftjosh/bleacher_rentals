"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "../../../components/ui/button";

export function AccountDeactivated() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100 p-6">
      <div className="max-w-xl bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-4">Your account has been deactivated</h1>
        <p className="text-gray-600 mb-8">
          Please contact support if you believe this is a mistake.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a className="text-sm underline text-darkBlue" href="mailto:josh@bleacherrentals.com">
            Contact support
          </a>
          <SignOutButton>
            <Button variant="destructive">Log out</Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
