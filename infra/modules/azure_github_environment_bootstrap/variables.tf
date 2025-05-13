variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
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

  description = "The Azure Entra ID groups to give role to."
}

variable "terraform_storage_account" {
  type = object({
    resource_group_name = string
    name                = string
  })

  description = "Details of the Storage Account (name and resource group) hosting the Terraform state file."
}

variable "pep_vnet_id" {
  type        = string
  description = "The ID of the Virtual Network (VNet) containing the subnet dedicated to Private Endpoints."
}

variable "apim_id" {
  type        = string
  description = "The ID of the Azure API Management (APIM) instance."
  default     = null
}

variable "sbns_id" {
  type        = string
  description = "The ID of the Azure Service Bus Namespace."
  default     = null
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics Workspace for monitoring and diagnostics."
  default     = null
}

variable "private_dns_zone_resource_group_id" {
  type        = string
  description = "The ID of the resource group containing private DNS zones."
}

variable "nat_gateway_resource_group_id" {
  type        = string
  default     = null
  description = "The ID of the resource group hosting NAT Gateways."
}

variable "opex_resource_group_id" {
  type        = string
  description = "The ID of the resource group containing Opex dashboards."
}

variable "keyvault_common_ids" {
  type        = list(string)
  default     = []
  description = "A list of IDs for Key Vaults containing common secrets."
}

variable "subscription_id" {
  type        = string
  description = "The Azure subscription ID where resources will be created."
}

variable "tenant_id" {
  type        = string
  description = "The Azure tenant ID where resources will be created."
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
    configure                = optional(bool, true)
  })

  description = "Details about the GitHub repository, including owner, name, description, topics, and branch/tag policies. Set the configure option to false only if you already setup the repository for another cloud service provider or environment in the same project."
}

variable "github_private_runner" {
  type = object({
    container_app_environment_id       = string
    container_app_environment_location = string
    replica_timeout_in_seconds         = optional(number, 1800)
    polling_interval_in_seconds        = optional(number, 30)
    min_instances                      = optional(number, 0)
    max_instances                      = optional(number, 30)
    labels                             = optional(list(string), [])
    key_vault = object({
      name                = string
      resource_group_name = string
      secret_name         = optional(string, "github-runner-pat")
      use_rbac            = optional(bool, false)
    })
    cpu    = optional(number, 0.5)
    memory = optional(string, "1Gi")
  })

  description = "Configuration for GitHub private runners, including environment details, scaling options, and Key Vault integration."
}

variable "additional_resource_group_ids" {
  type        = set(string)
  default     = []
  description = "A set of IDs for existing resource groups owned by the domain team."

  validation {
    condition = alltrue([
      for id in var.additional_resource_group_ids : provider::azurerm::parse_resource_id(id)["resource_type"] == "resourceGroups"
    ])
    error_message = "Only resource group IDs are allowed."
  }
}
