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

variable "test_kind" {
  type        = string
  description = "Test type: must be 'integration' (setup module is not used by e2e tests)"

  validation {
    condition     = var.test_kind == "integration"
    error_message = "test_kind must be 'integration' (setup is not used by e2e tests)"
  }
}
