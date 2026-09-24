"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn, focusRing } from "@/lib/utils";

interface RepositoryMultiSelectProps {
  /** Repositories currently selected, in display order. */
  value: readonly string[];
  onChange: (repositories: string[]) => void;
  /** Every selectable repository, already sorted for display. */
  options: readonly string[];
}

const triggerClassName =
  "flex min-w-56 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-accent focus-visible:border-accent";

const chipClassName =
  "inline-flex items-center gap-1 rounded-full border border-border bg-subtle py-1 pr-1 pl-2.5 text-xs text-foreground";

const chipRemoveClassName =
  "inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

const itemClassName =
  "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-muted";

const actionClassName =
  "rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";

/**
 * Multi-repository picker with inline search.
 *
 * Built on cmdk (filtering, keyboard navigation) inside a Radix popover, so a
 * long repository list stays navigable by keyboard and by typing. The selection
 * is rendered as removable chips below the trigger; an empty selection is a
 * valid state that the API turns into empty results.
 */
export function RepositoryMultiSelect({
  onChange,
  options,
  value,
}: RepositoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (repository: string) => {
    const selected = new Set(value);

    if (selected.has(repository)) {
      selected.delete(repository);
    } else {
      selected.add(repository);
    }

    // Re-derive from `options` so the selection keeps the display order rather
    // than the order in which repositories were picked.
    onChange(options.filter((option) => selected.has(option)));
  };

  const remove = (repository: string) => {
    onChange(value.filter((selected) => selected !== repository));
  };

  return (
    <div className="block space-y-1.5">
      <span
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        id={labelId}
      >
        Repositories
      </span>
      <Popover.Root onOpenChange={setOpen} open={open}>
        <Popover.Trigger asChild>
          <button
aria-label={`Repositories: ${value.length === 0 ? "no repository selected" : `${value.length} selected`}`}
            className={cn(triggerClassName, focusRing)}
            type="button"
          >
            <span className="truncate">
              {value.length === 0
                ? "No repository selected"
                : `${value.length} selected`}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            className="z-50 w-72 rounded-lg border border-border bg-card shadow-lg outline-none"
            // Let the search input own the initial focus instead of the content
            // wrapper, so a keyboard user can start typing immediately.
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
            sideOffset={4}
          >
            <Command label="Repositories">
              <Command.Input
                className="w-full rounded-t-lg border-b border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-subtle-foreground"
                placeholder="Search repositories…"
                ref={inputRef}
              />
              <div className="flex items-center justify-between border-b border-border px-1.5 py-1">
                <button
                  className={actionClassName}
                  onClick={() => onChange([...options])}
                  type="button"
                >
                  Select all
                </button>
                <button
                  className={actionClassName}
                  onClick={() => onChange([])}
                  type="button"
                >
                  Clear
                </button>
              </div>
              <Command.List className="custom-scrollbar max-h-64 overflow-y-auto p-1">
                <Command.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No repository found.
                </Command.Empty>
                {options.map((repository) => {
                  const selected = value.includes(repository);

                  return (
                    <Command.Item
                      key={repository}
                      className={itemClassName}
                      onSelect={() => toggle(repository)}
                      value={repository}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex size-4 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-accent bg-accent text-white"
                            : "border-border",
                        )}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="truncate">{repository}</span>
                      <span className="sr-only">
                        {selected ? "selected" : "not selected"}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {value.map((repository) => (
            <li key={repository}>
              <span className={chipClassName}>
                {repository}
                <button
                  aria-label={`Remove ${repository}`}
                  className={cn(chipRemoveClassName, focusRing)}
                  onClick={() => remove(repository)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
