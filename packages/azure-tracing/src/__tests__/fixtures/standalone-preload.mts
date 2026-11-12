/*
Preload module emulating a standalone Node.js application (Container App, App
Service) that instruments itself through the public
`@pagopa/azure-tracing/azure-monitor` entrypoint instead of the Azure Functions
preload. The ESM hook is only needed because this fixture runs as ESM.
 */

import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "module";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

import { initAzureMonitor } from "../../azure/monitor";

initAzureMonitor();

await waitForAllMessagesAcknowledged();
