/**
 * Tooltip content for Tracker dashboard
 */

export const trackerTooltips = {
  avgTimeToClose:
    "Average time from request submission to completion. Shows responsiveness.",
  byCategory:
    "Requests grouped by type. Reveals which tools or features need most support.",
  byPriority:
    "Requests grouped by urgency. Shows if high-priority work is being addressed.",
  closedRequestsTotal:
    "Total requests resolved. Indicates team capacity and delivery.",
  frequencyTrend:
    "Daily request volume with trend line. Identifies peak demand periods.",
  openedRequestsTotal: "Total requests opened. Measures demand on DX team.",
  requestsTrend:
    "Percentage trend in requests. Shows if demand is increasing or decreasing.",
  title:
    "Monitors the status and progress of team DX improvement requests and initiatives.",
} as const;
