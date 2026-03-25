import { context as otelContext, propagation } from "@opentelemetry/api";

/**
 * Minimal structural interface for the Azure Functions v4 `app` object.
 * Using a structural type instead of `typeof app` from `@azure/functions`
 * makes this function compatible with any minor version of `@azure/functions@^4`
 * installed by the consumer, without type conflicts between versions.
 */
interface AzureFunctionsApp {
  hook: {
    preInvocation: (
      handler: (context: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Function is intentionally used here to remain compatible with any minor version of @azure/functions without importing its types
        functionHandler: Function;
        invocationContext: {
          traceContext?: {
            traceParent?: null | string;
            traceState?: null | string;
          };
        };
      }) => void,
    ) => unknown;
  };
}

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
 * @example
 * In your application, where you add the Azure Functions hooks (like `app.http()` and so on), you
 * can add the following code:
 *
 * registerAzureFunctionHooks(app);
 *
 */
export const registerAzureFunctionHooks = ({ hook }: AzureFunctionsApp) => {
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
