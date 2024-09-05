---
sidebar_label: Azure and Tracing for NodeJS Applications
---

# Azure and Tracing for NodeJS Applications

This guide covers the integration of Azure services with OpenTelemetry (OT) for
tracing NodeJS applications, along with benchmarking and performance insights.

## Azure and OpenTelemetry

Microsoft is rapidly adopting **OpenTelemetry (OT)** as the standard for
tracing, migrating from older custom solutions (e.g., vendor protocols for
**Application Insights**).

**OpenTelemetry (OT)** is an open-source framework for collecting monitoring and
telemetry data, including traces, metrics, and logs, from software applications
to improve observability and debugging.

The OT ecosystem for **NodeJS** consists of vendor-neutral libraries that enable
a **NodeJS** process (whether on Azure or AWS) to send metrics to an OT
"collector":

[open-telemetry/opentelemetry-js: OpenTelemetry JavaScript Client](https://github.com/open-telemetry/opentelemetry-js)

In the specific case of Azure, the collector is **Azure Monitor**.

The reference OT package for **NodeJS** in the Azure ecosystem is
[@azure/monitor-opentelemetry](https://www.npmjs.com/package/@azure/monitor-opentelemetry),
which exports a method `useAzureMonitor` that enables the necessary
instrumentation for popular libraries (such as `http`, `redis`, `mysql`,
`postgresql`, etc.), so metrics can be transparently traced for users of
different SDK clients.

OT instrumentation is implemented through runtime patching of the client SDK
calls. Therefore, you need to import the necessary libraries
(**@azure/monitor-opentelemetry**) and call the `useAzureMonitor` method before
including any other package in the codebase.

## Patching native fetch

The **@azure/monitor-opentelemetry** package does not patch the native fetch
method by default, which is commonly used in modern NodeJS applications. To
trace fetch calls, you must use the **@azure/monitor-opentelemetry** APIs
directly.

:::note

At the time of writing this document, instrumenting the native fetch of NodeJS
(based on the undici package) requires an additional step on top of using the
useAzureMonitor method:

[Monitor OpenTelemetry - Add native fetch instrumentation](https://github.com/Azure/azure-sdk-for-js/issues/29864)

:::

## Using the Application Insights SDK

The latest version of the **Application Insights SDK (3.x)** is essentially a
wrapper around OT functionalities provided by the
**@azure/monitor-opentelemetry** package:

[microsoft/ApplicationInsights-node.js: Microsoft Application Insights SDK for Node.js](https://github.com/microsoft/ApplicationInsights-node.js)

The new AI SDK exposes:

1. The **useAzureMonitor** method, which calls the method exposed by the
   **@azure/monitor-opentelemetry** package and maps legacy AI configuration
   onto new OT parameters.
2. A series of
   "[shims](https://github.com/microsoft/ApplicationInsights-node.js/tree/main/src/shim)"
   that enable the SDK's adoption in legacy applications using tracing methods
   from previous versions (e.g., `trackEvent`) without refactoring the existing
   code.

:::note

Although you can enable tracing and metrics using only the
**@azure/monitor-opentelemetry** package, if you want to use legacy AI methods
(e.g., `trackEvent`), you must use the **AI SDK** and call the **setup** and
**start** methods at the bootstrap of the application to initialize the default
**TelemetryClient**.

:::

Alternatively, you can use only **@azure/monitor-opentelemetry** to send custom
events, but in this case, you would need to re-implement the wrapper, similar to
what the AI SDK does:

[Send Custom Event to AI · Issue #29196 · Azure/azure-sdk-for-js](https://github.com/Azure/azure-sdk-for-js/issues/29196)

:::warning

This approach is not recommended because it requires alignment with the
internals of Application Insights, which may change over time. On the other
hand, the AI SDK may fall behind new versions of
**@azure/monitor-opentelemetry**.

:::

## Enabling HTTP KeepAlive

:::note

Unlike previous versions, HTTP keepAlive is enabled by default in all modern
Azure SDKs, and there is no longer a need to set up a custom agent.

[azure-sdk-for-js/sdk/core/core-rest-pipeline/src/pipelineRequest.ts](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-rest-pipeline/src/pipelineRequest.ts#L149)

:::

## Integration with App Service

Both **Azure Functions** and **App Services (NodeJS)** allow integration with
**Application Insights** without using the SDK. This integration is active in
the following scenarios:

1. The legacy environment variable **APPINSIGHTS_INSTRUMENTATIONKEY** is set.
2. The environment variable **APPLICATIONINSIGHTS_CONNECTION_STRING** is set.

When either of these variables is set, the **NodeJS** application incorporates a
custom AI agent that starts at bootstrap before importing any other module.

:::warning

This mechanism interferes with the programmatic setup of the AI SDK, overwriting
its settings. Therefore, it is recommended to disable the default integration by
removing these environment variables whether you are using the AI SDK
programmatically.

:::

There is currently no way to achieve end-to-end tracing using the basic
integration.

If using the AI SDK, ensure that the default AI integration is disabled by
ensuring that the **APPINSIGHTS_INSTRUMENTATIONKEY** and
**APPLICATIONINSIGHTS_CONNECTION_STRING** variables are not set. It is
recommended to use a custom environment variable that will be configured in the
**useAzureMonitor** and/or **setup** settings.

To verify that the default integration is indeed disabled, navigate to the
**"Application Insights"** panel of the App Service on the Azure portal.

## Integration with Next.js Deployed on Azure App Service

The same considerations apply to applications deployed on **App Service**, but
since there is no entry point as with other frameworks, you must use the
**instrumentation module**, which is loaded first by **Next.js** to load
**Application Insights/OpenTelemetry** as the first thing:

https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry#manual-opentelemetry-configuration

## Integration with Azure Functions

At the time of writing, OT integration with **Azure Functions (NodeJS)** is not
yet complete:

**[Support open telemetry · Issue #245 · Azure/azure-functions-nodejs-library](https://github.com/Azure/azure-functions-nodejs-library/issues/245)**

For full integration, which enables end-to-end tracing of calls, it is necessary
to incorporate a wrapper around the Functions' handlers that programmatically
activates the OpenTelemetry mechanisms. Benchmarks have shown that the wrapper
does not introduce any significant performance penalties.

## Cloud Role Name

As of the publication of this document, the **AI SDK 3.x** has certain
limitations:

[microsoft/ApplicationInsights-node.js: Microsoft Application Insights SDK for Node.js](https://github.com/microsoft/ApplicationInsights-node.js?tab=readme-ov-file#limitations-of-application-insights-3x-sdk)

The most significant limitation concerns the population of **cloudRoleName**,
which is not set by default. As a result, tracing details and the application
map show the origins as **unknown_service**.

The **setAutoPopulateAzureProperties** method is currently a no-op, and by
default, the AI SDK only uses the **envDetector**, which sets **cloudRoleName**
from the **OTEL_SERVICE_NAME** environment variable.

Likewise, setting a value for
**ai.defaultClient.context.tags[ai.defaultClient.context.keys.cloudRole]**
produces no result, even though some online tutorials suggest it. These
tutorials are now considered obsolete.

:::info

For setting an appropriate **cloudRoleName**, the **OTEL_SERVICE_NAME**
environment variable must be set.

:::

## Performance

Load tests were performed on **App Service** and **Azure Functions**, with the
following conditions:

1. AI completely disabled.
2. AI enabled with sampling at 0%.
3. AI enabled with sampling at 50%.
4. AI enabled with sampling at 100%.

### Benchmark on App Service

The test was conducted using **Azure Load Test** on a test App Service (B1) for
5 minutes with an average of 200 requests per second. There was a maximum
overhead of 30ms observed between tests with 100% sampling compared to those
with AI disabled.

![AI App Service Benchmark](./azure-tracing/image.png)

:::note

Using a sampling level < 30% introduces negligible overhead with AI enabled via
SDK

:::

### Benchmark on Azure Functions

The test was conducted on an **Azure Function** using the **Y1 consumption
plan** for 5 minutes with an average of 200 requests per second. Once the
instances had scaled, a maximum overhead of 60ms was observed between tests with
100% sampling and those with AI disabled.

![AI Functions Benchmark](./azure-tracing/image-1.png)

It seems that the sampling value had less impact on time differences once the
instances had scaled horizontally. However, the time needed for scaling
increased linearly with the sampling values.

## Key Takeaways

1. It's reccomended to start migrating logging and metric tracing procedures to
   **OpenTelemetry**, incorporating the new version of the **AI SDK 3.x**.
2. Adopting **OT** is currently the only method for achieving end-to-end
   tracing, including the tracing of native NodeJS fetch requests.
3. Disable default integrations and use the SDK programmatically.
4. The current OT implementation on **Azure Functions** is incomplete; monitor
   progress and use a wrapper in the meantime.

## Code Snippets

### Example Integration with App Service

```javascript
import * as ai from "applicationinsights";

import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { metrics, trace } from "@opentelemetry/api";
import { IJsonConfig } from "applicationinsights/out/src/shim/types";

if (process.env["AI_SDK_CONNECTION_STRING"]) {
  console.log("using opetelemetry");

  // setup sampling percentage from environment, see
  // https://github.com/microsoft/ApplicationInsights-node.js?tab=readme-ov-file#configuration
  // for other options. environment variable is in JSON format and takes
  // precedence over applicationinsights.json
  process.env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] =
    process.env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] ??
    JSON.stringify({
      samplingPercentage: 30,
    } satisfies Partial<IJsonConfig>);

  // setup cloudRoleName
  process.env.OTEL_SERVICE_NAME =
    process.env.WEBSITE_SITE_NAME ?? "local-app-service";

  // instrument native node fetch
  registerInstrumentations({
    tracerProvider: trace.getTracerProvider(),
    meterProvider: metrics.getMeterProvider(),
    instrumentations: [new UndiciInstrumentation()],
  });

  ai.setup(process.env["AI_SDK_CONNECTION_STRING"]).start();
}
export default ai;
```

### Example Integration with Azure Functions

```javascript
import { HttpRequest, InvocationContext, HttpHandler } from "@azure/functions";
import {
  Attributes,
  SpanKind,
  SpanOptions,
  SpanStatusCode,
  TraceFlags,
  context,
  trace,
  Span,
  SpanContext,
} from "@opentelemetry/api";
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
} from "@opentelemetry/semantic-conventions";

export default function createAppInsightsWrapper(func: HttpHandler) {
  return async (req: HttpRequest, invocationContext: InvocationContext) => {
    if (
      !process.env["AI_SDK_CONNECTION_STRING"] ||
      process.env["DISABLE_FUNCTION_WRAPPER"]
    ) {
      console.log(
        `skipping wrapper for function ${invocationContext.functionName}`,
      );
      return await func(req, invocationContext);
    }
    const startTime = Date.now();

    // Extract the trace context from the incoming request
    const traceParent = req.headers.get("traceparent");
    const parts = traceParent?.split("-");

    const parentSpanContext: SpanContext | null =
      parts &&
      parts.length === 4 &&
      parts[1].length === 32 &&
      parts[2].length === 16
        ? {
            traceId: parts[1],
            spanId: parts[2],
            traceFlags: TraceFlags.NONE,
          }
        : null;

    const activeContext = context.active();

    // Set span context as the parent context if any
    const parentContext = parentSpanContext
      ? trace.setSpanContext(activeContext, parentSpanContext)
      : activeContext;

    const attributes: Attributes = {
      [SEMATTRS_HTTP_METHOD]: "HTTP",
      [SEMATTRS_HTTP_URL]: req.url,
    };

    const options: SpanOptions = {
      kind: SpanKind.SERVER,
      attributes: attributes,
      startTime: startTime,
    };

    const span: Span = trace
      .getTracer("ApplicationInsightsTracer")
      .startSpan(`${req.method} ${req.url}`, options, parentContext);

    let res;
    try {
      res = await context.with(trace.setSpan(activeContext, span), async () => {
        return await func(req, invocationContext);
      });
      const status = res?.status;
      if (status) {
        span.setStatus({
          code: status < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, status);
      }
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : JSON.stringify(error),
      });
      throw error;
    } finally {
      span.end(Date.now());
    }

    return res;
  };
}
```

```javascript
app.http("root", {
  route: "/",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: createAppInsightsWrapper(async (req) => ({
    body: `Hello, ${req.query.get("name")}!`,
  })),
});
```
