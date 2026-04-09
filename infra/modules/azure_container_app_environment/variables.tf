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
    virtual_network = object({
      name                = string
      resource_group_name = string
    })
    private_dns_zone_resource_group_name = optional(string, null)
    public_network_access_enabled        = optional(bool, false)
  })
  description = <<-EOT
    Networking configuration for the Container App Environment.
    If networking.private_dns_zone_resource_group_name is not set, it is assumed that the private DNS zone is in the same resource group as the virtual network.
    If networking.public_network_access_enabled is true, the environment will be configured for public access.
  EOT
}
