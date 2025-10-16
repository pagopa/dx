const core = require('@actions/core');

async function run() {
  try {
    core.info('Installing Azure Monitor OpenTelemetry distro and dependencies (already provided by workflow step if cached)...');
    // Actual install is expected to be handled by the workflow before usage or via a prior cache restore.
    // If we wanted to force install here we could spawn `npm i` but that would slow down every run.
    // Provide tracer/log initialization placeholder so post can flush.
    const { useAzureMonitor } = require('@azure/monitor-opentelemetry');
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
      }
    });
    core.saveState('otel_init', 'true');
    core.info('Azure Monitor OpenTelemetry initialized.');
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
