import { app } from "@azure/functions";
import { context as otelContext, propagation } from "@opentelemetry/api";

/**
 * Registers Azure Function hooks to enable OpenTelemetry tracing.
 * These hooks extract trace context from the Azure Function context
 * and bind it to the function handler, ensuring that traces are
 * properly propagated across function invocations.
 *
 * Once the issues that causes this workaround are resolved, it will be possible
 * to add the [azure-functions-nodejs-opentelemetry](https://github.com/Azure/azure-functions-nodejs-opentelemetry/tree/main)
 * to the instrumentation package and remove this workaround.
 *
 * @param {Object} options - An object containing the Azure Functions `hook` object.
 * @param {Function} options.hook - The Azure Functions `hook` object from the `app` module.
 */
export const registerAzureFunctionHooks = ({ hook }: typeof app) => {
  hook.preInvocation((context) => {
    const traceContext = context.invocationContext.traceContext;
    if (traceContext) {
      context.functionHandler = otelContext.bind(
        propagation.extract(otelContext.active(), {
          traceparent: traceContext.traceParent,
          tracestate: traceContext.traceState,
        }),
        context.functionHandler,
      );
    }
  });
};
