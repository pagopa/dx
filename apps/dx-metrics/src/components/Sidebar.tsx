"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GitPullRequest,
  MessageSquare,
  PlayCircle,
  Cloud,
  TrendingUp,
  Users,
  Activity,
  Ship,
} from "lucide-react";
import {
  readSidebarCollapsedState,
  sidebarCollapsedStorageKey,
  sidebarToggleEventName,
} from "@/lib/sidebar-state";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboards/pull-requests",
    label: "Pull Requests",
    icon: GitPullRequest,
  },
  {
    href: "/dashboards/pull-requests-review",
    label: "PR Reviews",
    icon: MessageSquare,
  },
  { href: "/dashboards/workflows", label: "Workflows", icon: PlayCircle },
  { href: "/dashboards/iac", label: "IaC PRs", icon: Cloud },
  { href: "/dashboards/dx-adoption", label: "DX Adoption", icon: TrendingUp },
  { href: "/dashboards/dx-team", label: "DX Team", icon: Users },
  { href: "/dashboards/dx-tracker", label: "DX Tracker", icon: Activity },
  { href: "/dashboards/dx-releases", label: "DX Releases", icon: Ship },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(readSidebarCollapsedState);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(newState));
    // Dispatch a custom event to notify the layout
    window.dispatchEvent(new Event(sidebarToggleEventName));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-[#30363d] bg-[#0d1117] transition-all duration-300 ease-in-out z-20",
        isCollapsed ? "w-16" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex items-center p-4 h-16 border-b border-[#30363d] relative",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight truncate">
            Engineering <br />
            <span className="text-green-500 text-sm">M e t r i c s</span>
          </h1>
        )}

        <button
          onClick={toggleSidebar}
          className={cn(
            "p-1.5 rounded-md hover:bg-[#21262d] text-gray-400 hover:text-white border border-[#30363d] transition-colors",
            isCollapsed ? "" : "",
          )}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="mt-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const href = searchParams.toString()
            ? `${item.href}?${searchParams.toString()}`
            : item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all group relative",
                isActive
                  ? "bg-[#21262d] font-semibold text-white border border-[#30363d]"
                  : "text-gray-400 hover:text-white hover:bg-[#161b22]",
                isCollapsed && "justify-center px-0",
              )}
            >
              <Icon
                size={18}
                className={cn(
                  isActive ? "text-green-500" : "group-hover:text-white",
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#21262d] border border-[#30363d] rounded text-white text-xs invisible group-hover:visible whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
