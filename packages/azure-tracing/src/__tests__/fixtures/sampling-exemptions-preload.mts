/*
Preload module emulating an application that keeps errors, exceptions and
exempted custom events even when trace-based sampling for logs discards the
logs of unsampled traces. `ENABLE_TRACE_BASED_SAMPLING_FOR_LOGS` selects the
distro behaviour, so the same fixture covers the documented opt-in
configuration and the misconfiguration the processor documentation warns about.
The ESM hook is only needed because this fixture runs as ESM.
 */

import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "module";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

import {
  initAzureMonitor,
  SamplingExemptionsLogRecordProcessor,
} from "../../azure/monitor";

initAzureMonitor([], {
  enableTraceBasedSamplingForLogs:
    process.env.ENABLE_TRACE_BASED_SAMPLING_FOR_LOGS === "true",
  logRecordProcessors: [new SamplingExemptionsLogRecordProcessor()],
});

await waitForAllMessagesAcknowledged();
