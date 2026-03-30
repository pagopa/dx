---
"@pagopa-dx/terraform-plan-storage-download": patch
"@pagopa-dx/terraform-plan-storage-upload": patch
---

Use AzureCliCredential instead of DefaultAzureCredential to avoid silent selection of the runner VM's Managed Identity on self-hosted runners
