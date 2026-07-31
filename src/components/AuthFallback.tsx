"use client";

import { usePathname } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

const PUBLIC_PREFIXES = ["/quote/"];

export function AuthFallback({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) {
    return <div className="h-dvh overflow-y-auto overscroll-contain">{children}</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn routing="hash" forceRedirectUrl="/dashboard" />
    </div>
  );
}
