/** Type definitions for the Tracker dashboard domain. */

export interface CategoryRow {
  readonly category: string;
  readonly requests: number;
}

export interface FrequencyTrendRow {
  readonly actual_requests: number;
  readonly request_date: string;
  readonly trend: number;
}

export interface PriorityRow {
  readonly priority: string;
  readonly requests: number;
}

export interface TrackerCards {
  readonly avgClose: null | number;
  readonly closedTotal: null | number;
  readonly openedTotal: null | number;
  readonly requestsTrend: null | number;
}

export interface TrackerDashboard {
  readonly byCategory: readonly CategoryRow[];
  readonly byPriority: readonly PriorityRow[];
  readonly cards: TrackerCards;
  readonly frequencyTrend: readonly FrequencyTrendRow[];
}
