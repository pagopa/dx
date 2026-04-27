variable "use_case" {
  type        = string
  description = "Allowed values: 'default', 'development'."
  default     = "default"

  validation {
    condition     = contains(["default", "development"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\", \"development\"."
  }
}

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the Azure Resource Group where the resources will be deployed."
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to use for the container app environment."
}

variable "networking" {
  type = object({
    virtual_network_id                   = string
    private_dns_zone_resource_group_name = optional(string, null)
    public_network_access_enabled        = optional(bool, false)
  })
  description = <<-EOT
    Networking configuration for the Container App Environment.
    - virtual_network_id: The Azure Resource ID of the Virtual Network where the module will create a dedicated /23 subnet.
    - private_dns_zone_resource_group_name: The resource group containing the Private DNS Zone for the container app environment. If not set, the zone is looked up in the VNet's resource group.
    - public_network_access_enabled: If true, the environment is accessible from public networks (no private endpoint or internal load balancer). Defaults to false.
  EOT
}
