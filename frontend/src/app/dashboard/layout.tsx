"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { clearSession, readSession } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      clearSession();
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return <div className="min-h-screen bg-[#0a0d14] text-slate-400 grid place-items-center">Loading GARMENTOS...</div>;

  return <div className="min-h-screen bg-[#0a0d14] text-slate-100 font-sans flex w-full overflow-x-hidden selection:bg-emerald-500 selection:text-white">
    <Sidebar />
    <main className="flex-1 pl-0 md:pl-20 transition-all duration-300 w-full min-w-0">
      <div className="w-full max-w-[1800px] mx-auto p-4 pt-16 md:pt-6 md:p-6 lg:p-10 space-y-8 md:space-y-10">{children}</div>
    </main>
  </div>;
}
