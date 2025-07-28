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

variable "map_public_ip_on_launch" {
  type        = bool
  description = "Whether to assign public IP addresses to instances launched in public subnets"
  default     = true
}

variable "enable_flow_logs" {
  type        = bool
  description = "Whether to enable VPC Flow Logs"
  default     = false
}

variable "flow_logs_destination_type" {
  type        = string
  description = "Type of destination for VPC Flow Logs (cloud-watch-logs or s3)"
  default     = "cloud-watch-logs"
  validation {
    condition     = contains(["cloud-watch-logs", "s3"], var.flow_logs_destination_type)
    error_message = "Flow logs destination type must be either 'cloud-watch-logs' or 's3'."
  }
}

variable "tags" {
  type        = map(any)
  description = "Tags to apply to resources"
}
