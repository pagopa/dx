# Stop Runtime Hardening

Stops Falco and writes its findings to the job summary. Use this action with
`if: always()` after
[`start-runtime-hardening`](../start-runtime-hardening/README.md), even if the
start action or a later step fails.
