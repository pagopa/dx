---
modules-aws-azure-vpn: major
modules-aws-github-environment-bootstrap: major
modules-azure-api-management: major
modules-azure-app-service: major
modules-azure-app-service-exposed: major
modules-azure-app-service-plan-autoscaler: major
modules-azure-cdn: major
modules-azure-container-app: major
modules-azure-container-app-environment: major
modules-azure-core-infra: major
modules-azure-event-hub: major
modules-azure-function-app-exposed: major
modules-azure-github-environment-bootstrap: major
modules-azure-postgres-server: major
modules-azure-role-assignments: major
modules-azure-service-bus-alerts: major
modules-azure-service-bus-namespace: major
modules-azure-storage-account: major
modules-github-selfhosted-runner-on-container-app-jobs: major
---

Update example Terraform state backends from the DEV environment to UAT.

## Migration guide

The examples now reference the UAT Terraform state resource group and storage
account. Existing DEV state entries are intentionally not migrated because the
states are empty; reinitialize the examples against the UAT backend.
