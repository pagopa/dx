"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import {
  readSidebarCollapsedState,
  sidebarToggleEventName,
} from "@/lib/sidebar-state";
import { cn } from "@/lib/utils";

export function ClientLayout({ children }: { children: React.ReactNode }) {
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
          <header className="sticky top-0 z-10 flex items-center justify-end border-b border-[#30363d] bg-[#0d1117]/80 px-6 py-4 backdrop-blur-md">
            <div className="rounded-full border border-[#30363d] bg-[#21262d] px-3 py-1.5">
              <span className="text-xs font-medium text-[#e6edf3]">
                Anonymous access
              </span>
            </div>
          </header>
          <main className="p-8 max-w-[1600px] mx-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
