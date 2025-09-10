#---------#
# General #
#---------#

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    region          = string
    app_name        = string
    instance_number = string
  })
  description = "Values which are used to generate resource names and region short names."
}

variable "project" {
  type        = string
  description = "Project name for resource naming."
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID where to deploy the CoreDNS instance."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for security group creation."
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block for security group rules."
}

variable "cross_cloud_dns_config" {
  type = object({
    azure_coredns_ip = string
    azure_vnet_cidr  = string
  })
  description = "Cross-cloud DNS configuration for Azure integration."
}

variable "static_private_ip" {
  type        = string
  description = "Static private IP address for the CoreDNS instance. If empty, will use cidrhost calculation."
  default     = ""
}
