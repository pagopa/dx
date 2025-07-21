variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    domain          = optional(string)
    instance_number = number
  })
  description = "Configuration object for generating consistent resource names"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block of the VPC"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for VPN endpoint association"
}

variable "client_cidr_block" {
  type        = string
  description = "CIDR block for VPN client connections"
  default     = "172.16.0.0/16"
}

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources"
}
