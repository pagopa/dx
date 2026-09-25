"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LocaleProvider } from "@/components/LocaleProvider";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { writeSidebarCollapsed } from "@/lib/sidebar-state";
import { cn, focusRing } from "@/lib/utils";

export function ClientLayout({
  children,
  initialCollapsed,
}: {
  children: React.ReactNode;
  initialCollapsed: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Tracks whether the drawer was ever opened, so focus is only restored to the
  // trigger when the drawer actually closed instead of on first mount.
  const wasDrawerOpenRef = useRef(false);

  // A drawer that survives navigation would cover the page the reader asked for.
  // Adjusting during render beats an effect that paints the new page first and
  // then corrects itself.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsDrawerOpen(false);
  }

  // Move focus into the drawer when it opens and back to the trigger when it
  // closes, so keyboard readers are not left behind the overlay. The background
  // is made `inert` below while the drawer is open, which keeps it out of the
  // tab order.
  useEffect(() => {
    if (isDrawerOpen) {
      wasDrawerOpenRef.current = true;
      document
        .getElementById("app-sidebar")
        ?.querySelector<HTMLElement>("button, a[href]")
        ?.focus();
      return;
    }

    if (wasDrawerOpenRef.current) {
      wasDrawerOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isDrawerOpen]);

  // The drawer only exists below `lg`; closing it when the viewport grows keeps
  // the page content from staying `inert` behind an overlay that no longer
  // covers anything.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsDrawerOpen(false);
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  const toggleCollapsed = () => {
    setIsCollapsed((collapsed) => {
      writeSidebarCollapsed(!collapsed);
      return !collapsed;
    });
  };

  return (
    <LocaleProvider>
      <TooltipProvider>
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-muted focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
          href="#dashboard-content"
          inert={isDrawerOpen}
        >
          Skip to content
        </a>

        <div className="flex min-h-screen bg-background font-sans">
          <Sidebar
            isCollapsed={isCollapsed}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onToggleCollapsed={toggleCollapsed}
          />

          <div
            className={cn(
              "min-w-0 flex-1 transition-[margin] duration-300 ease-in-out",
              isCollapsed ? "lg:ml-16" : "lg:ml-56",
            )}
            inert={isDrawerOpen}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-controls="app-sidebar"
                  aria-expanded={isDrawerOpen}
                  aria-label="Open navigation"
                  className={cn(
                    "-ml-1 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden",
                    focusRing,
                  )}
                  onClick={() => setIsDrawerOpen(true)}
                  ref={triggerRef}
                  type="button"
                >
                  <Menu aria-hidden="true" size={18} />
                </button>

                <h1 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                  Engineering <span className="text-accent">Metrics</span>
                </h1>
              </div>

              <ThemeToggle />
            </header>

            <main
              className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8"
              id="dashboard-content"
            >
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </LocaleProvider>
  );
}
