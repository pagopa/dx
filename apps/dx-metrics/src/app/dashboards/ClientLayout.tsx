"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import {
  readSidebarCollapsedState,
  sidebarToggleEventName,
} from "@/lib/sidebar-state";
import { cn } from "@/lib/utils";

// Better Auth session shape: { user: { image, name, ... }, session: { ... } } | null
type ClientSession = null | {
  user?: null | { image?: null | string; name?: null | string };
};

export function ClientLayout({
  children,
  session,
  signOutAction,
  skipAuth,
}: {
  children: React.ReactNode;
  session: ClientSession;
  signOutAction: () => Promise<void>;
  skipAuth: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(readSidebarCollapsedState);

  useEffect(() => {
    // Listener for sidebar toggle in current tab
    const handleToggle = () => {
      setIsCollapsed(readSidebarCollapsedState());
    };

    window.addEventListener(sidebarToggleEventName, handleToggle);
    return () =>
      window.removeEventListener(sidebarToggleEventName, handleToggle);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-[#0a0c10] font-sans">
        <Sidebar />
        <div
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            isCollapsed ? "ml-16" : "ml-56",
          )}
        >
          <header className="flex items-center justify-between border-b border-[#30363d] bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
            <div />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#21262d] border border-[#30363d]">
                {session?.user?.image && (
                  <Image
                    alt=""
                    className="h-6 w-6 rounded-full ring-1 ring-[#8b949e]/20"
                    height={24}
                    src={session.user.image}
                    width={24}
                  />
                )}
                <span className="text-xs font-medium text-[#e6edf3]">
                  {session?.user?.name ?? "Local Dev"}
                </span>
              </div>
              {!skipAuth && (
                <form action={signOutAction}>
                  <button
                    className="text-xs font-semibold text-gray-500 hover:text-white transition-colors"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </header>
          <main className="p-8 max-w-[1600px] mx-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
