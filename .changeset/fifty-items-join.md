---
"azure_container_app": major
---

Container image name is no longer stored in Terraform state file, to allow CD pipelines to update the tag without requiring an update to the Terraform code.
