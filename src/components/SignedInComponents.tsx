"use client";
import Header from "@/components/Header";
import SideBar from "@/components/Sidebar";
import useSupabaseSubscriptions from "@/hooks/useSupabaseSubscriptions";
import { SignOutButton, useSession, useUser } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { useRef } from "react";
import { LayoutProvider } from "@/contexts/LayoutContexts";
import { DriverWelcome } from "./DriverWelcome";
import { useUserAccess } from "@/features/userAccess";
import LoadingSpinner from "./LoadingSpinner";

function SignedInContent({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useSupabaseSubscriptions();
  const { accessLevel, reason, isLoading } = useUserAccess();

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Denied access (deactivated, no roles, or user not found)
  if (accessLevel === "denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100">
        <h1 className="text-2xl font-semibold mb-4">
          {reason === "Account deactivated"
            ? "Your account has been deactivated."
            : "Access Denied"}
        </h1>
        <p className="text-gray-600 mb-6">
          {reason === "Account deactivated"
            ? "Please contact support if you believe this is a mistake."
            : "You do not have the necessary permissions to access this application."}
        </p>
        <SignOutButton>
          <Button variant="destructive">Log out</Button>
        </SignOutButton>
      </div>
    );
  }

  // Driver-only access
  if (accessLevel === "driver-only") {
    return <DriverWelcome />;
  }

  return (
    <LayoutProvider scrollRef={scrollRef}>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <SideBar />
          <main ref={scrollRef} className="flex-1  bg-gray-50 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}

export function SignedInComponents({ children }: { children: React.ReactNode }) {
  const { session, isLoaded: sessionLoaded } = useSession();
  const { isLoaded: userLoaded } = useUser();

  // Wait for both session and user to be loaded
  if (!sessionLoaded || !userLoaded || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return <SignedInContent>{children}</SignedInContent>;
}
