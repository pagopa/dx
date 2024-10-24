variable "principal_id" {
  type = string
}

variable "resource" {
  type = string

  validation {
    condition     = contains(["key_vault", "cosmos", "storage_account", "redis"], var.resource)
    error_message = "The resource must be one of the following: key_vault, cosmos, storage_account, or redis."
  }
}

variable "type" {
  type    = string
  default = "rbac"

  validation {
    condition     = contains(["rbac", "policy"], var.type)
    error_message = "The type must be one of the following: rbac or policy."
  }
}