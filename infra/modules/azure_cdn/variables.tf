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

  validation {
    condition     = length(var.environment.prefix) == 2
    error_message = "The prefix length must be 2 characters"
  }

  validation {
    condition     = contains(["d", "u", "p"], var.environment.env_short)
    error_message = "Environment short name must be one of: 'd' (Development), 'u' (UAT), 'p' (Production)"
  }
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

variable "delivery_rules" {
  description = "Map of delivery rule configurations that will be applied to the CDN endpoint"
  type = map(object({
    order = number
    url_path_conditions    = optional(list(string))
    url_file_extension_conditions = optional(list(string))
    request_scheme_condition = optional(string) # "Http" or "Https"
    actions = object({
      url_redirect_action = optional(object({
        redirect_type  = string # "Moved", "Found", "TemporaryRedirect", "PermanentRedirect"
        redirect_protocol = optional(string) # "Http", "Https"
        destination_hostname = optional(string, "")
        destination_path = optional(string)
        query_string = optional(string)
      }))
      url_rewrite_action = optional(object({
        source_pattern = string
        destination = string
        preserve_unmatched_path = optional(bool, true)
      }))
    })
  }))
  default = {
    "http-to-https" = {
      order = 1
      request_scheme_condition = "Http"
      actions = {
        url_redirect_action = {
          redirect_type = "PermanentRedirect"
          redirect_protocol = "Https"
        }
      }
    }
  }
}

variable "custom_domains" {
  description = "Map of custom domain configurations to associate with the CDN endpoint"
  type = map(object({
    host_name = string
  }))
  default = {}
}