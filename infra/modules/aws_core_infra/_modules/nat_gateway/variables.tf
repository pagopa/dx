variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    region          = string
    name            = string
    instance_number = number
  })
  description = "Configuration for resource naming convention"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs where NAT Gateways will be created"
}

variable "nat_gateway_count" {
  type        = number
  description = "Number of NAT gateways to create"
  default     = 3
}

variable "tags" {
  type        = map(any)
  description = "Tags to apply to resources"
}
