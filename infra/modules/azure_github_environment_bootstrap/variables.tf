variable "tags" {
  type        = map(string)
  description = "Resources tags"
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "entraid_groups" {
  type = object({
    admins_object_id    = string
    devs_object_id      = string
    externals_object_id = optional(string, null)
  })

  description = "Azure Entra Id groups to give role to"
}

variable "terraform_storage_account" {
  type = object({
    resource_group_name = string
    name                = string
  })

  description = "Name and resource group name of the Storage Account hosting the Terraform state file"
}

variable "pep_vnet_id" {
  type        = string
  description = "ID of the VNet holding Private Endpoint-dedicated subnet"
}

variable "apim_id" {
  type        = string
  description = "(Optional) ID of the APIM instance"
  default     = null
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "(Optional) ID of the Log Analytics Workspace"
  default     = null
}

variable "private_dns_zone_resource_group_id" {
  type        = string
  description = "Id of the resource group holding private DNS zones"
}

variable "nat_gateway_resource_group_id" {
  type        = string
  default     = null
  description = "(Optional) Id of the resource group hosting NAT Gateways"
}

variable "opex_resource_group_id" {
  type        = string
  description = "Id of the resource group containing Opex dashboards"
}

variable "keyvault_common_ids" {
  type        = list(string)
  default     = []
  description = "Id of the KeyVault containing common secrets"
}

variable "subscription_id" {
  type        = string
  description = "The subscription ID where resources are created"
}

variable "tenant_id" {
  type        = string
  description = "The tenant ID where resources are created"
}

variable "repository" {
  type = object({
    owner                    = optional(string, "pagopa")
    name                     = string
    description              = string
    topics                   = list(string)
    reviewers_teams          = list(string)
    default_branch_name      = optional(string, "main")
    infra_cd_policy_branches = optional(set(string), ["main"])
    opex_cd_policy_branches  = optional(set(string), ["main"])
    app_cd_policy_branches   = optional(set(string), ["main"])
    infra_cd_policy_tags     = optional(set(string), [])
    opex_cd_policy_tags      = optional(set(string), [])
    app_cd_policy_tags       = optional(set(string), [])
    jira_boards_ids          = optional(list(string), [])
  })

  description = "Information about this repository"
}

variable "github_private_runner" {
  type = object({
    container_app_environment_id       = string
    container_app_environment_location = string
    polling_interval_in_seconds        = optional(number, 30)
    min_instances                      = optional(number, 0)
    max_instances                      = optional(number, 30)
    labels                             = optional(list(string), [])
    key_vault = object({
      name                = string
      resource_group_name = string
      secret_name         = optional(string, "github-runner-pat")
    })
    cpu    = optional(number, 0.5)
    memory = optional(string, "1Gi")
  })
}

variable "additional_resource_group_ids" {
  type        = set(string)
  default     = []
  description = "(Optional) List of existing resource groups of which the domain team is the owner."

  validation {
    condition = alltrue([
      for id in var.additional_resource_group_ids : provider::azurerm::parse_resource_id(id)["resource_type"] == "resourceGroups"
    ])
    error_message = "This variable accepts resource group IDs only"
  }
}
