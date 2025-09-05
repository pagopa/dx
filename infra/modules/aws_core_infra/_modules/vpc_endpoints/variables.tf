variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    region          = string
    name            = string
    instance_number = number
  })
  description = "Configuration object for generating consistent resource names"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC where endpoints will be created"
}

variable "region" {
  type        = string
  description = "AWS region for service endpoints"
}

variable "private_route_table_ids" {
  type        = list(string)
  description = "List of private route table IDs for gateway endpoints"
}

variable "isolated_route_table_ids" {
  type        = list(string)
  description = "List of isolated route table IDs for gateway endpoints"
  default     = []
}

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources"
}
