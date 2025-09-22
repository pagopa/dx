variable "core_state" {
  type = object({
    key = string

    # S3 backend configuration (AWS)
    bucket         = optional(string, null)
    region         = optional(string, null)
    dynamodb_table = optional(string, null)

    # Azure Storage backend configuration
    storage_account_name = optional(string, null)
    container_name       = optional(string, null)
    resource_group_name  = optional(string, null)
  })
  description = "Configuration for accessing the core Terraform state. Supports both S3 (AWS) and Azure Storage backends."

  validation {
    condition = (
      # Either S3 configuration is provided
      (var.core_state.bucket != null && var.core_state.region != null) ||
      # Or Azure Storage configuration is provided
      (var.core_state.storage_account_name != null && var.core_state.container_name != null && var.core_state.resource_group_name != null)
    )
    error_message = "Either S3 configuration (bucket, region) or Azure Storage configuration (storage_account_name, container_name, resource_group_name) must be provided."
  }
}
