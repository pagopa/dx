"use client";

import {
  Activity,
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Gauge,
  GitPullRequest,
  MessageSquare,
  PlayCircle,
  Ship,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn, focusRing } from "@/lib/utils";

const navGroups = [
  {
    items: [
      { href: "/dashboards/overview", icon: Gauge, label: "Overview" },
      { href: "/dashboards/benchmark", icon: BarChart3, label: "Benchmark" },
    ],
    label: "Overview",
  },
  {
    items: [
      {
        href: "/dashboards/pull-requests",
        icon: GitPullRequest,
        label: "Pull Requests",
      },
      {
        href: "/dashboards/pull-requests-review",
        icon: MessageSquare,
        label: "PR Reviews",
      },
      { href: "/dashboards/workflows", icon: PlayCircle, label: "Workflows" },
      { href: "/dashboards/iac", icon: Cloud, label: "IaC PRs" },
      { href: "/dashboards/dx-releases", icon: Ship, label: "DX Releases" },
    ],
    label: "Delivery",
  },
  {
    items: [
      { href: "/dashboards/techradar", icon: Target, label: "Techradar" },
      {
        href: "/dashboards/dx-adoption",
        icon: TrendingUp,
        label: "DX Adoption",
      },
      { href: "/dashboards/dx-team", icon: Users, label: "DX Team" },
      { href: "/dashboards/copilot", icon: Bot, label: "Copilot" },
    ],
    label: "Adoption",
  },
  {
    items: [
      { href: "/dashboards/dx-tracker", icon: Activity, label: "DX Tracker" },
    ],
    label: "Operations",
  },
];

interface SidebarProps {
  /** Desktop rail state: a 64px icon rail instead of the 224px panel. */
  isCollapsed: boolean;
  /** Off-canvas drawer state, used below the `lg` breakpoint only. */
  isOpen: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  isCollapsed,
  isOpen,
  onClose,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border bg-card",
          // `visibility` keeps the closed drawer out of the tab order and the
          // accessibility tree, while still letting it slide.
          "transition-[translate,visibility] duration-300 ease-in-out",
          isOpen ? "visible translate-x-0" : "invisible -translate-x-full",
          "lg:visible lg:z-20 lg:translate-x-0 lg:transition-[width]",
          isCollapsed ? "lg:w-16" : "lg:w-56",
        )}
        id="app-sidebar"
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border p-4",
            isCollapsed ? "justify-between lg:justify-center" : "justify-end",
          )}
        >
          <button
            aria-label="Close navigation"
            className={cn(
              "rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden",
              focusRing,
            )}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>

          <button
            aria-label={
              isCollapsed ? "Expand navigation" : "Collapse navigation"
            }
            className={cn(
              "hidden rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex",
              focusRing,
            )}
            onClick={onToggleCollapsed}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight aria-hidden="true" size={18} />
            ) : (
              <ChevronLeft aria-hidden="true" size={18} />
            )}
          </button>
        </div>

        <nav
          aria-label="Dashboards"
          className="custom-scrollbar mt-4 flex-1 overflow-y-auto px-2"
        >
          {navGroups.map((group, groupIndex) => (
            <div className={cn(groupIndex > 0 && "mt-4")} key={group.label}>
              {/*
                The section heading stays in the accessibility tree in every
                rail state; only its visual rendering is suppressed.
              */}
              <p
                className={cn(
                  "px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-subtle-foreground",
                  isCollapsed && "lg:sr-only",
                )}
              >
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const href = queryString
                    ? `${item.href}?${queryString}`
                    : item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "border border-border bg-muted font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-subtle hover:text-foreground",
                        isCollapsed && "lg:justify-center lg:px-0",
                        focusRing,
                      )}
                      href={href}
                      key={item.href}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "shrink-0",
                          isActive
                            ? "text-accent"
                            : "group-hover:text-foreground",
                        )}
                        size={18}
                      />
                      {/*
                        The label stays in the accessibility tree in every rail
                        state; only its visual rendering is suppressed.
                      */}
                      <span
                        className={cn("truncate", isCollapsed && "lg:sr-only")}
                      >
                        {item.label}
                      </span>

                      {isCollapsed && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none invisible absolute left-full ml-2 hidden whitespace-nowrap rounded border border-border bg-muted px-2 py-1 text-xs text-foreground group-hover:visible group-focus-visible:visible lg:block"
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
