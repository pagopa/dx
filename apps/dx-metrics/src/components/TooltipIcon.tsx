"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";

import { cn, focusRing } from "@/lib/utils";

interface TooltipIconProps {
  className?: string;
  content: string;
  /** Metric or panel being explained. Names the trigger for assistive tech. */
  label: string;
  side?: "bottom" | "left" | "right" | "top";
}

export default function TooltipIcon({
  className,
  content,
  label,
  side = "top",
}: TooltipIconProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          aria-label={`More information about ${label}`}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center",
            "text-gray-400 transition-colors hover:text-gray-300",
            focusRing,
            className,
          )}
          type="button"
        >
          <HelpCircle aria-hidden="true" size={16} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-50 max-w-xs rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-sm break-words text-[#e6edf3] shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
          side={side}
          sideOffset={5}
        >
          {content}
          <Tooltip.Arrow className="fill-[#161b22]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
