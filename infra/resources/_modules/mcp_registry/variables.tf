variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    instance_number = number
  })
}

variable "resource_group_id" {
  type        = string
  description = "The resource group ID where the API Center will be created"
}

variable "location" {
  type        = string
  description = "The Azure region where the API Center will be created"
  default     = "westeurope"
}

variable "mcp_servers" {
  type = map(object({
    name        = string
    description = string
    versions    = list(string)
    type        = optional(string, "remote")
    visibility  = optional(bool, true)
    external_documentation = optional(list(object({
      title = string
      url   = string
    })), [])
    # Remote servers
    uri = optional(string)
    protocols = optional(object({
      sse        = optional(bool, false)
      streamable = optional(bool, true)
    }))
  }))
  description = "Map of MCP servers to register in the API Center"

  validation {
    condition = alltrue([
      for k, v in var.mcp_servers :
      contains(["local", "remote"], v.type)
    ])
    error_message = "Server type must be either 'local' or 'remote'."
  }

  validation {
    condition = alltrue([
      for k, v in var.mcp_servers :
      v.type == "local" || (v.uri != null && v.protocols != null && (v.protocols.sse == true || v.protocols.streamable == true))
    ])
    error_message = "Remote servers must have uri and at least one protocol (sse or streamable) enabled."
  }
}

variable "cdn" {
  type = object({
    resource_group_name         = string
    network_resource_group_name = string
    custom_domain_host_name     = optional(string, "mcp.dx.pagopa.it")
  })
  description = "CDN related configuration"
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
