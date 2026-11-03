"use client";

/** Client-side carrier for the visitor's scope, read by every filter control. */

import { createContext, useContext } from "react";

/**
 * The repositories a visitor may see. It reaches the client from the server
 * layout, because the list depends on the magic link and no longer exists as a
 * static import.
 */
export interface ScopeValue {
  /** Whether the scope covers the whole portfolio. */
  readonly all: boolean;
  readonly repositories: readonly string[];
}

const ScopeContext = createContext<null | ScopeValue>(null);

export function ScopeProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ScopeValue;
}) {
  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

/** Reads the current scope. Throws outside a provider rather than showing
 * everything: an empty fallback would be indistinguishable from a broad scope. */
export function useScope(): ScopeValue {
  const scope = useContext(ScopeContext);
  if (scope === null) {
    throw new Error("useScope must be used inside a ScopeProvider");
  }
  return scope;
}
