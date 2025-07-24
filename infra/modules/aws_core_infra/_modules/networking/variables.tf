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

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for public subnets"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for private subnets"
}

variable "isolated_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for isolated subnets"
  default     = []
}

variable "tags" {
  type        = map(any)
  description = "Tags to apply to resources"
}
