/** Shares sidebar persistence details across the dashboard shell UI. */

export const sidebarCollapsedStorageKey = "sidebar-collapsed";
export const sidebarToggleEventName = "sidebar-toggle";

export const readSidebarCollapsedState = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(sidebarCollapsedStorageKey) === "true";
};
