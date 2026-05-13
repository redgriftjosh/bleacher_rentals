"use client";
import Header from "@/components/Header";
import SideBar from "@/components/sidebar/Sidebar";
import useSupabaseSubscriptions from "@/hooks/useSupabaseSubscriptions";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutProvider } from "@/contexts/LayoutContexts";
import { useUserAccess } from "@/features/userAccess/client";
import LoadingSpinner from "./LoadingSpinner";
import { CannotFindAccount } from "../features/userAccess/components/CannotFindAccount";
import { NoRolesAssigned } from "../features/userAccess/components/NoRolesAssigned";
import { AccountDeactivated } from "../features/userAccess/components/AccountDeactivated";
import { DriverWelcome } from "@/features/userAccess/components/DriverWelcome";
import { EventConfigModal } from "@/features/eventConfiguration/components/EventConfigModal";

export function SignedInComponents({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  useSupabaseSubscriptions();
  const { accessLevel, reason } = useUserAccess();

  // Developer-only: redirect to /roadmap if on a non-roadmap page
  useEffect(() => {
    if (accessLevel === "developer-only" && !pathname.startsWith("/roadmap")) {
      router.replace("/roadmap");
    }
  }, [accessLevel, pathname, router]);

  // Wait for both session and user to be loaded
  if (accessLevel === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <LoadingSpinner />
        <div className="mt-6">
          <SignOutButton>
            <Button variant="outline">Log out</Button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  if (accessLevel === "cannot-find-account") {
    return <CannotFindAccount />;
  }

  if (accessLevel === "account-deactivated") {
    return <AccountDeactivated />;
  }

  if (accessLevel === "no-roles-assigned") {
    return <NoRolesAssigned />;
  }

  // Driver-only access
  if (accessLevel === "driver-only") {
    return <DriverWelcome />;
  }

  const isDeveloperOnly = accessLevel === "developer-only";

  return (
    <LayoutProvider scrollRef={scrollRef}>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          {!isDeveloperOnly && <SideBar />}
          <main ref={scrollRef} className="flex-1  bg-gray-50 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      {!isDeveloperOnly && <EventConfigModal />}
    </LayoutProvider>
  );
}
