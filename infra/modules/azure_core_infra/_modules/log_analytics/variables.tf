variable "name_env" {
  type = object({
    prefix          = string,
    environment     = string,
    location        = string,
    instance_number = optional(number, 1),
  })
  description = "Map with naming values for resource names"
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which the Log Analytics will be created"
}

variable "location" {
  type        = string
  description = "The location in which the Log Analytics will be created"
}

variable "tags" {
  type        = map(any)
  description = "A mapping of tags to assign to the resource"
}