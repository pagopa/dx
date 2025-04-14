variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
  description = "Values used to generate resource name"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where the App Service Plan will be created"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "tier" {
  type        = string
  description = "Resource tier. Allowed values are 's', 'm', 'l', 'xl'"

  validation {
    condition     = contains(["s", "m", "l", "xl"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", \"l\", \"xl\""
  }
}
