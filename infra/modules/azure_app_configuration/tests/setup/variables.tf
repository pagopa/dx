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
  description = "Tags to apply to setup resources"
}

variable "test_kind" {
  type        = string
  description = "A value between integration and e2e"

  validation {
    condition     = contains(["integration", "e2e"], var.test_kind)
    error_message = "The test_kind variable must be either 'integration' or 'e2e'."
  }
}
