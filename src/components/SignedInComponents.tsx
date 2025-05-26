"use client";

import Header from "@/components/Header";
import SideBar from "@/components/Sidebar";
import useSubToDbChanges from "@/hooks/useSubToDbChanges";

export function SignedInComponents({ children }: { children: React.ReactNode }) {
  useSubToDbChanges();
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideBar />
        <main className="flex-1  bg-gray-50 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
