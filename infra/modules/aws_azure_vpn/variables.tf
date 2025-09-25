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
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and region short names."
}

variable "use_case" {
  type        = string
  description = "Deployment scenario for the Site-to-Site VPN connection. 'development' creates a single VPN connection suitable for dev/test environments (cost-optimized). 'high_availability' creates multiple redundant VPN connections for production workloads with enhanced reliability."
  default     = "development"
  validation {
    condition     = contains(["development", "high_availability"], var.use_case)
    error_message = "use_case must be either 'development' or 'high_availability'."
  }
}

#-----#
# AWS #
#-----#
variable "aws" {
  type = object({
    region               = string
    vpc_id               = string
    vpc_cidr             = string
    route_table_ids      = list(string)
    private_subnet_ids   = list(string)
    private_subnet_cidrs = list(string)
    private_dns_zones    = optional(list(string), [])
  })
  description = <<-EOT
AWS configuration object containing all required AWS-side settings. Includes the target VPC details, networking configuration, and DNS zones for cross-cloud resolution. 
The region must be supported (eu-west-1, eu-south-1). Route table IDs will be updated with VPN routes. Private subnets are used for DNS resolver endpoints. 
DNS zones listed here will be forwarded to Azure for resolution.
EOT
}

#-------#
# Azure #
#-------#
variable "azure" {
  type = object({
    resource_group_name = string
    location            = string
    vnet_id             = string
    vnet_name           = string
    vnet_cidr           = string
    dns_forwarder_ip    = string
    vpn = optional(object({ # If not provided, a new Virtual Network Gateway will be created
      virtual_network_gateway_id = string
      public_ips                 = list(string)
    }), { virtual_network_gateway_id = null, public_ips = [] })
    private_dns_zones = list(string)
  })
  description = <<-EOT
Azure configuration object containing all required Azure-side settings. Includes the target Virtual Network details, resource group, and VPN gateway configuration. 
The vpn_snet_id must point to a GatewaySubnet (minimum /27). If vpn.virtual_network_gateway_id is null, a new VPN gateway will be created. 
The dns_forwarder_ip should point to your Azure DNS forwarder for cross-cloud DNS resolution. Private DNS zones listed here will be forwarded to AWS for resolution.
EOT
}
