import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";

export const registerUndiciInstrumentation = () =>
  new UndiciInstrumentation({
    requestHook: (span, requestInfo) => {
      const { method, origin, path } = requestInfo;
      // Default instrumented attributes don't feed well into AppInsights,
      // so we set them manually.
      span.setAttributes({
        "http.host": origin,
        "http.method": method,
        "http.target": path,
        "http.url": `${origin}${path}`,
      });
    },
    responseHook: (span, { response }) => {
      // Same as above, set the status code manually.
      span.setAttribute("http.status_code", response.statusCode);
    },
  });
