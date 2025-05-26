---
"@pagopa/azure-tracing": minor
---

Enhance support for legacy Azure Function (v3) to ensure the requests are properly correlated.

## Usage

For legacy Azure Functions, you can use the wrap the Azure Function within the `withOtelContextFunctionV3` to make sure the requests are properly correlated.

```typescript
import { AzureFunction, Context as FunctionContext } from "@azure/functions"; // "@azure/functions": "^3"
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler.js";

import { withOtelContextFunctionV3 } from "@pagopa/azure-tracing/azure-functions/v3"; // from version ^0.4.0

export const expressToAzureFunction =
  (app: Express): AzureFunction =>
  (context: FunctionContext): void => {
    app.set("context", context);
    withOtelContextFunctionV3(context)(createAzureFunctionHandler(app)); // wrap the function execution in the OpenTelemetry context
  };
```
