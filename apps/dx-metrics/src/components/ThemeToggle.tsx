"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { cn, focusRing } from "@/lib/utils";
import type { Theme } from "@/lib/theme";

const OPTIONS: readonly {
  Icon: typeof Sun;
  label: string;
  value: Theme;
}[] = [
  { Icon: Sun, label: "Light", value: "light" },
  { Icon: Moon, label: "Dark", value: "dark" },
];

/**
 * Dark/light switch that replaces the former "Anonymous access" badge.
 *
 * Rendered as a segmented control rather than a checkbox so the active theme is
 * visible at a glance; each segment is a pressed button so assistive tech
 * announces which theme is selected.
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <div
      aria-label="Colour theme"
      className="hidden shrink-0 items-center gap-0.5 rounded-full border border-border bg-muted p-0.5 sm:flex"
      role="group"
    >
      {OPTIONS.map(({ Icon, label, value }) => {
        const isActive = theme === value;

        return (
          <button
            aria-label={`${label} mode`}
            aria-pressed={isActive}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              focusRing,
            )}
            key={value}
            onClick={() => setTheme(value)}
            type="button"
          >
            <Icon aria-hidden="true" size={15} />
          </button>
        );
      })}
    </div>
  );
}
