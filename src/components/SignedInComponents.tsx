"use client";
import Header from "@/components/Header";
import SideBar from "@/components/Sidebar";
import useSupabaseSubscriptions from "@/hooks/useSupabaseSubscriptions";
import { SignOutButton, useUser, useSession } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { useUsersStore } from "@/state/userStore";
import { useRef } from "react";
import { LayoutProvider } from "@/contexts/LayoutContexts";
import { DriverWelcome } from "./DriverWelcome";

function SignedInContent({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useSupabaseSubscriptions();
  const { user } = useUser();
  const users = useUsersStore((s) => s.users);

  const currentUser = users.find((u) => u.clerk_user_id === user?.id);
  const isDeactivated = currentUser?.status === 3;
  const isDriver = currentUser?.role === 3;

  if (isDeactivated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100">
        <h1 className="text-2xl font-semibold mb-4">Your account has been deactivated.</h1>
        <p className="text-gray-600 mb-6">
          Please contact support if you believe this is a mistake.
        </p>
        <SignOutButton>
          <Button variant="destructive">Log out</Button>
        </SignOutButton>
      </div>
    );
  }

  if (isDriver) {
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
  const { user, isLoaded: userLoaded } = useUser();

  // Wait for both session and user to be loaded
  if (!sessionLoaded || !userLoaded || !session) {
    return null;
  }

  return <SignedInContent>{children}</SignedInContent>;
}
