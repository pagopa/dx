variable "subscription_id" {
  description = "The ID of the subscription where the custom roles will be created. Omit it together with subscription_name to use the current provider subscription automatically."
  type        = string
  default     = null

  validation {
    condition     = var.subscription_id == null ? true : trimspace(var.subscription_id) != ""
    error_message = "subscription_id must be null or a non-empty string."
  }
}

variable "subscription_name" {
  description = "The display name of the subscription where the custom roles will be created. Omit it to auto-discover the display name for the selected subscription."
  type        = string
  default     = null

  validation {
    condition     = var.subscription_name == null ? true : trimspace(var.subscription_name) != ""
    error_message = "subscription_name must be null or a non-empty string."
  }

  validation {
    condition     = var.subscription_name == null ? true : var.subscription_id != null && trimspace(var.subscription_id) != ""
    error_message = "subscription_name requires subscription_id. Omit both values to use the current provider subscription automatically."
  }
}
