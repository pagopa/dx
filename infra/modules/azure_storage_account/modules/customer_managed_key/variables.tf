variable "storage_account_id" {
    type = string
    description = "Storage Account ID to attach the customer managed key to"
}

variable "customer_managed_key" {
  type = object({
    enabled                   = optional(bool, false)
    type                      = optional(string, null)
    key_name                  = optional(string)
    user_assigned_identity_id = optional(string, null)
    key_vault_key_id          = optional(string, null)
    managed_hsm_key_id        = optional(string, null)
  })
  description = "(Optional) Customer managed key to use for encryption"
  default     = { enabled = false, key_name = null }
}