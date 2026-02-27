---
"azure_core_infra": major
---

Migrate GitHub runner Container App Environment (CAE) to Workload Profiles. It will be asked for CAE replacement.

## Migration Guide

- Delete all the jobs hosted on the CAE
- Apply this new version to replace the Consumption CAE with the new Workload Profile CAE.
- Re-apply bootstrapper modules in repositories that had the self-hosted runner in the old CAE
