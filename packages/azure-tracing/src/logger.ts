import { logs } from "@opentelemetry/api-logs";

/**
 * Emit a custom event to the Azure Monitor.
 * This function is used to emit custom events to the Azure Monitor.
 *
 * @param eventName the name of the event to emit
 * @param attributes the attributes to include with the event
 */
export const emitCustomEvent =
  (eventName: string, attributes: Record<string, string>) =>
  (loggerName = "ApplicationInsightsLogger") => {
    logs.getLogger(loggerName).emit({
      attributes: {
        "microsoft.custom_event.name": eventName,
        ...attributes,
      },
    });
  };
