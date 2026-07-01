variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    domain          = optional(string)
    app_name        = optional(string)
    instance_number = string
  })
  description = "Values used to generate resource names and location short names."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the AI Foundry account."
}

variable "virtual_network" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
  description = "The common virtual network from which the private Foundry endpoint is reachable."
}

variable "private_endpoint_subnet_id" {
  type        = string
  description = "The subnet ID where the Foundry private endpoint is created."
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
