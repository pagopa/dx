variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to setup resources."
}

variable "test_kind" {
  type        = string
  description = "Test kind. Must be 'integration' (E2E tests use examples/ instead of this setup module)."

  validation {
    condition     = var.test_kind == "integration"
    error_message = "test_kind must be 'integration'. This setup module is not used by E2E tests."
  }
}
