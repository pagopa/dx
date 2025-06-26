variable "core_state" {
  type = object({
    resource_group_name  = string
    storage_account_name = string
    container_name       = string
    key                  = string
  })
  description = "Configuration for accessing the core Terraform state where azure-core-infra module is deployed."
}
