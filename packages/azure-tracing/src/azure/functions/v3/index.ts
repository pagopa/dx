import { context as otelContext, propagation } from "@opentelemetry/api";

/**
 * Interface representing the necessary parts of the Azure Functions v3 Context
 * for OpenTelemetry trace context propagation.
 */
interface FunctionContextV3 {
  traceContext?: {
    traceparent?: string;
    tracestate?: string;
  };
}

/**
 * Wraps an Azure Function v3 handler to propagate OpenTelemetry context.
 *
 * This function extracts trace context from a v3-like context object (simulated via `FunctionContextV3` interface)
 * and runs the provided `v3Function` within that context, ensuring OpenTelemetry trace propagation.
 *
 * @param context The Azure Function v3 context object (or an object conforming to `FunctionContextV3`).
 * @param v3Function The original Azure Function v3 handler function.
 * @returns A new function that, when called with the v3 context, executes the original handler with OpenTelemetry context propagation.
 */
export const withOtelContextFunctionV3 =
  <T extends FunctionContextV3>(context: T) =>
  (v3Function: (context: T) => void) => {
    const traceContext = context.traceContext ?? {};
    const headers = {
      traceparent: traceContext.traceparent,
      tracestate: traceContext.tracestate,
    };

    const ctx = propagation.extract(otelContext.active(), headers);

    return otelContext.with(ctx, () => {
      v3Function(context);
    });
  };
