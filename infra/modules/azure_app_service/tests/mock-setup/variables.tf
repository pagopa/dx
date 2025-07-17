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

variable "use_mock_data" {
  type        = bool
  default     = true
  description = "Whether to use mock data instead of querying Azure resources"
}