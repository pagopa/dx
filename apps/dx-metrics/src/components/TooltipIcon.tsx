"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipIconProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export default function TooltipIcon({
  content,
  side = "top",
  className,
}: TooltipIconProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center",
            "text-gray-400 hover:text-gray-300 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
            className,
          )}
          aria-label="More information"
        >
          <HelpCircle size={16} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={5}
          className="max-w-xs px-2 py-1 text-sm bg-[#161b22] text-[#e6edf3] border border-[#30363d] rounded shadow-lg z-50 break-words animate-in fade-in-0 zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
        >
          {content}
          <Tooltip.Arrow className="fill-[#161b22]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
