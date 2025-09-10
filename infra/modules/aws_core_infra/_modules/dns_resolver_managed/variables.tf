# Managed/High-Availability DNS Resolution using AWS Route53 Resolver and Azure Private DNS Resolver

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

variable "vpc_id" {
  type        = string
  description = "VPC ID where to deploy the Route53 Resolver endpoints."
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for Route53 Resolver endpoints (minimum 2 subnets in different AZs)."
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block for security group rules."
}

variable "cross_cloud_dns_config" {
  type = object({
    azure_resolver_inbound_ip = string
    azure_vnet_cidr           = string
  })
  description = "Cross-cloud DNS configuration for Azure Private DNS Resolver integration."
}
