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

`allowed-domains` is an optional newline-separated allowlist. It replaces the
default list in `action.yaml`; include the domains required by your workload,
GitHub, and Falco's report dependencies (`pypi.org` and
`files.pythonhosted.org`). Blocked connections appear in the job summary.
An incomplete list can make the job fail.

Bullfrog supports GitHub-hosted Ubuntu runners, not container jobs or
self-hosted runners. Ubuntu 26.04 is not listed among its documented supported
versions. Sudo remains enabled for Docker, so privileged code can bypass
network filtering. Falco findings are reported in the job summary, not as PR
comments.
