variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    region          = string
    name            = string
    domain          = optional(string)
    instance_number = number
  })
  description = "Configuration for resource naming convention"
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC"
}

variable "internet_gateway_id" {
  type        = string
  description = "ID of the Internet Gateway"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs"
}

variable "isolated_subnet_ids" {
  type        = list(string)
  description = "List of isolated subnet IDs"
  default     = []
}

variable "nat_gateway_ids" {
  type        = list(string)
  description = "List of NAT Gateway IDs"
  default     = []
}

variable "tags" {
  type        = map(any)
  description = "Tags to apply to resources"
}
