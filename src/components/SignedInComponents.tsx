"use client";

import Header from "@/components/Header";
import SideBar from "@/components/Sidebar";
import useSupabaseSubscriptions from "@/hooks/useSupabaseSubscriptions";

export function SignedInComponents({ children }: { children: React.ReactNode }) {
  useSupabaseSubscriptions();
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideBar />
        <main className="flex-1 p-6 bg-gray-50 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
