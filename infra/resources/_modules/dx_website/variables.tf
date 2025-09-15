variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the Static Web App."
}

variable "network_resource_group_name" {
  type        = string
  description = "The name of the resource group where the network resources are located, used for DNS records."
}

variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    instance_number = number
  })
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
