"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "../../../components/ui/button";

export function CannotFindAccount() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100 p-6">
      <div className="max-w-xl bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-4">Can’t find your account</h1>
        <p className="text-gray-600 mb-6">
          We couldn’t find a matching user record for your login. This usually means your Clerk
          account hasn’t been linked in the database yet.
        </p>
        <p className="text-gray-600 mb-8">
          Please contact support or your admin to get your account provisioned.
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
