/** Shares sidebar persistence details across the dashboard shell UI. */

/**
 * The rail state is read on the server from this cookie and written back when
 * the reader toggles it, so the first paint already matches the stored value
 * and hydration never disagrees with the server markup.
 */
export const sidebarCollapsedCookieName = "sidebar-collapsed";

/** Cookie values are strings; only the literal `"true"` means collapsed. */
export const parseSidebarCollapsed = (value: string | undefined) =>
  value === "true";

export const writeSidebarCollapsed = (collapsed: boolean) => {
  document.cookie = `${sidebarCollapsedCookieName}=${collapsed}; path=/; max-age=31536000; samesite=lax`;
};
