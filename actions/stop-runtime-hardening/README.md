# Stop Runtime Hardening

Stops Falco and writes its findings to the job summary. Use this action with
`if: always()` after
[`start-runtime-hardening`](../start-runtime-hardening/README.md), even if the
start action or a later step fails. Findings are grouped by rule and priority,
without raw output or commands. The summary limits its size and reports any
omitted groups. The event file remains available to the telemetry collector.
