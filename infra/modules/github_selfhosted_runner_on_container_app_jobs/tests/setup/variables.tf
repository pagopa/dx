variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to setup resources"
}

variable "test_kind" {
  type        = string
  description = "Test type: must be 'integration' (setup is not used by e2e tests)"
}
