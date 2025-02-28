variable "resource_group_name" {
  type        = string
  description = "Resource group name where the CDN profile will be created"
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
  description = "Environment configuration object for resource naming"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "origins" {
  type = map(object({
    host_name = string
    priority  = optional(number, 1)
  }))
  description = "Map of origin configurations. Key is the origin identifier. Priority determines routing preference (lower values = higher priority)"
}

variable "custom_domains" {
  description = "Map of custom domain configurations to associate with the CDN endpoint. If dns parameter is set, DNS records are created."
  type = list(object({
    host_name = string
    dns = optional(object({
      zone_name                = string
      zone_resource_group_name = string
    }), { zone_name = null, zone_resource_group_name = null })
  }))
  default = []
}