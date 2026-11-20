/**
 * Metadata attached to every dashboard payload, as read by the UI.
 *
 * Kept separate from the adapter type so client pages do not import the server
 * database layer just to describe a response.
 */
export interface DashboardMetaView {
  /** First calendar date the dashboard has data for. */
  availableFrom?: string;
  /** Last calendar date the dashboard has data for. */
  availableTo?: string;
  /** Length of the applied window, in days. */
  days?: number;
  /** Latest data timestamp, used by the freshness note. */
  referenceDate: string;
  /** End of the applied window (`YYYY-MM-DD`). */
  windowEnd?: string;
  /** Start of the applied window (`YYYY-MM-DD`). */
  windowStart?: string;
}
