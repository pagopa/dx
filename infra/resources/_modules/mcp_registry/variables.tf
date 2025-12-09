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
    external_documentation = optional(list(object({
      title = string
      url   = string
    })), [])
    uri = string
  }))
  description = "Map of MCP servers to register in the API Center"
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
