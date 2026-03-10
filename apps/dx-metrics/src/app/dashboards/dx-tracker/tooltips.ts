/**
 * Tooltip content for Tracker dashboard
 */

export const trackerTooltips = {
  title:
    "Monitors the status and progress of team DX improvement requests and initiatives.",
  openedRequestsTotal: "Total requests opened. Measures demand on DX team.",
  closedRequestsTotal: "Total requests resolved. Indicates team capacity and delivery.",
  avgTimeToClose: "Average time from request submission to completion. Shows responsiveness.",
  requestsTrend: "Percentage trend in requests. Shows if demand is increasing or decreasing.",
  frequencyTrend:
    "Daily request volume with trend line. Identifies peak demand periods.",
  byCategory: "Requests grouped by type. Reveals which tools or features need most support.",
  byPriority: "Requests grouped by urgency. Shows if high-priority work is being addressed.",
} as const;
