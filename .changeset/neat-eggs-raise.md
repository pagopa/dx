---
"@pagopa/azure-tracing": patch
---

Update OpenTelemetry dependencies

The version previously used of `@azure/monitor-opentelemetry` contained a bug that did not export a variable causing a runtime error.  
To locally fix it, it was necessary to patch the package, but now the issue has been fixed in the latest version, so we can remove the patch and update the dependency.  
You can find more details about the issue [here](https://github.com/Azure/azure-sdk-for-js/issues/35466).
