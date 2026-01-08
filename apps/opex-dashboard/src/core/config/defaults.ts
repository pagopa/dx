/**
 * Configuration defaults.
 * Default values for dashboard generation.
 */

import {
  DEFAULT_AVAILABILITY_THRESHOLD,
  DEFAULT_RESPONSE_TIME_THRESHOLD,
  EVALUATION_FREQUENCY_MINUTES,
  EVENT_OCCURRENCES,
  TIME_WINDOW_MINUTES,
} from "../../constants/index.js";

export const DEFAULT_TIMESPAN = "5m";

export const DEFAULTS = {
  availability_threshold: DEFAULT_AVAILABILITY_THRESHOLD,
  evaluation_frequency: EVALUATION_FREQUENCY_MINUTES,
  evaluation_time_window: TIME_WINDOW_MINUTES,
  event_occurrences: EVENT_OCCURRENCES,
  response_time_threshold: DEFAULT_RESPONSE_TIME_THRESHOLD,
  timespan: DEFAULT_TIMESPAN,
} as const;
