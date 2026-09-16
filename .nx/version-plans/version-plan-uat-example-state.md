---
modules-aws-azure-vpn: patch
modules-aws-github-environment-bootstrap: patch
modules-azure-api-management: patch
modules-azure-app-service: patch
modules-azure-app-service-exposed: patch
modules-azure-app-service-plan-autoscaler: patch
modules-azure-cdn: patch
modules-azure-container-app: patch
modules-azure-container-app-environment: patch
modules-azure-core-infra: patch
modules-azure-event-hub: patch
modules-azure-function-app-exposed: patch
modules-azure-github-environment-bootstrap: patch
modules-azure-postgres-server: patch
modules-azure-role-assignments: patch
modules-azure-service-bus-alerts: patch
modules-azure-service-bus-namespace: patch
modules-azure-storage-account: patch
modules-github-selfhosted-runner-on-container-app-jobs: patch
---

Update example Terraform state backends from the DEV environment to UAT.

The examples now reference the UAT Terraform state resource group and storage
account. Existing DEV state entries are intentionally not migrated because the
states are empty; reinitialize the examples against the UAT backend.
