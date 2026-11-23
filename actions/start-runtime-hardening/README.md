# Start Runtime Hardening

Starts Falco in live mode and enables Bullfrog egress blocking for subsequent
steps. Use it once per job, before the workload, and pair it with
[`stop-runtime-hardening`](../stop-runtime-hardening/README.md) using
`if: always()`:

```yaml
permissions:
  contents: read
  actions: read

steps:
  - name: Start runtime hardening
    uses: pagopa/dx/actions/start-runtime-hardening@main

  # Checkout, build and test steps go here.

  - name: Stop runtime hardening
    if: always()
    uses: pagopa/dx/actions/stop-runtime-hardening@main
```

The action waits for Falco's capture readiness before starting the workload
and fails if the monitor exits or does not become ready.

`allowed-domains` is an optional newline-separated allowlist. It replaces the
default list in `action.yaml`; include the domains required by your workload,
and GitHub. To retain the defaults and add workload-specific
domains, use `additional-allowed-domains`. Blocked connections appear in the
job summary. An incomplete list can make the job fail.

The action initializes `setup-telemetry` unless the job already has a
telemetry session. Its collector runs after Bullfrog's post step and queues
sanitized Falco findings and blocked Bullfrog connections for the telemetry
action's post step. Falco findings are grouped per job by rule and priority;
each event contains the count and the last observed timestamp. Bullfrog
events contain domain, port, protocol, decision, reason and timestamp. Allowed
connections remain in Bullfrog's job summary but are not exported. Command
lines, raw output, executable paths and IP addresses are not exported. The
telemetry export itself happens after collection and is not included in the
Bullfrog results. An existing telemetry session must remain available until
the post phase; in particular, a later checkout must not remove its event file.

The default telemetry connection string uses
`italynorth-0.in.applicationinsights.azure.com`, included in the default
allowlist. If overriding the allowlist or connection string, allow the actual
Application Insights ingestion endpoint. Telemetry is best effort; collection
errors are reported as warnings.

Bullfrog supports GitHub-hosted Ubuntu runners, not container jobs or
self-hosted runners. Ubuntu 26.04 is not listed among its documented supported
versions. Sudo remains enabled for Docker, so privileged code can bypass
network filtering. Falco findings are reported in the job summary, not as PR
comments.
