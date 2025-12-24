/**
 * Dashboard layout and configuration constants.
 * These values define the grid layout for Azure dashboards and default alarm thresholds.
 */

// Dashboard grid layout constants
export const GRAPH_ROW_SPAN = 4;
export const GRAPH_COL_SPAN = 6;
export const GRAPHS_PER_ROW = 3;

// Default alarm threshold constants
export const DEFAULT_AVAILABILITY_THRESHOLD = 0.99; // 99%
export const DEFAULT_RESPONSE_TIME_THRESHOLD = 1; // 1 second

// Alarm evaluation constants
export const EVALUATION_FREQUENCY_MINUTES = 10;
export const TIME_WINDOW_MINUTES = 20;
export const EVENT_OCCURRENCES = 1;
