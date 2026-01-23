"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "../../../components/ui/button";

export function NoRolesAssigned() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100 p-6">
      <div className="max-w-2xl bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-4">No roles assigned</h1>
        <p className="text-gray-600 mb-4">
          Your account is active, but you don’t have any permissions assigned yet.
        </p>
        <p className="text-gray-600 mb-8">
          Please ask your account manager to assign you to a Driver role, or an Account Manager
          role.
        </p>
        <SignOutButton>
          <Button variant="outline">Log out</Button>
        </SignOutButton>
      </div>
    </div>
  );
}
