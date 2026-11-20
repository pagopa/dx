/*
Preload module for the packed-package consumer. It mirrors a standalone Node.js
application (Container App, App Service) instrumenting itself through the public
`@pagopa/azure-tracing/azure-monitor` entrypoint, which resolves from the packed
tarball installed next to this file instead of the workspace sources. The ESM
hook is only needed because this consumer runs as ESM.
 */

import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "node:module";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";

initAzureMonitor();

await waitForAllMessagesAcknowledged();
