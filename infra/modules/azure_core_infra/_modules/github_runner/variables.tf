variable "naming_config" {
  type = object({
    prefix          = string,
    environment     = string,
    name            = optional(string, "github-runner"),
    location        = string,
    instance_number = optional(number, 1),
  })
  description = "Map with naming values for resource names"

}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Location"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "runner_snet" {
  type = string
}
