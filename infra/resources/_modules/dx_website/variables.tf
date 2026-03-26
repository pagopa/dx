variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the Static Web App."
}

variable "network_resource_group_name" {
  type        = string
  description = "The name of the resource group where the network resources are located, used for DNS records."
}

variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    instance_number = string
    domain          = optional(string)
    app_name        = optional(string)
  })
  description = "Values used to generate resource names and location short names."
}
variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
