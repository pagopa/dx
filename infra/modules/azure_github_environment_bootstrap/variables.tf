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

  description = "Values used to generate resource names and location short names."
}

variable "github_environment_prefix_enabled" {
  type        = bool
  default     = false
  description = "Prefix GitHub environment names with environment.prefix."
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

variable "terraform_state_container_access" {
  type = object({
    container_name = optional(string)
    upstream = optional(map(object({
      identities    = optional(set(string), [])
      principal_ids = optional(set(string), [])
    })), {})
  })
  default     = null
  description = "Opt in to container-scoped state permissions and select upstream readers."

  validation {
    condition = var.terraform_state_container_access == null ? true : (
      var.terraform_state_container_access.container_name == null ||
      (
        length(var.terraform_state_container_access.container_name) >= 3 &&
        length(var.terraform_state_container_access.container_name) <= 63 &&
        can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", var.terraform_state_container_access.container_name))
      )
    )
    error_message = "container_name must be a valid Azure container name."
  }

  validation {
    condition = var.terraform_state_container_access == null ? true : alltrue([
      for container, readers in var.terraform_state_container_access.upstream :
      length(element(reverse(split("/", lower(container))), 0)) >= 3 &&
      length(element(reverse(split("/", lower(container))), 0)) <= 63 &&
      can(regex(
        "^(/subscriptions/[^/]+/resourcegroups/[^/]+/providers/microsoft\\.storage/storageaccounts/[^/]+/blobservices/default/containers/)?[a-z0-9]+(-[a-z0-9]+)*$",
        lower(container)
      )) &&
      length(setunion(readers.identities, readers.principal_ids)) > 0 &&
      alltrue([
        for identity in readers.identities : contains([
          "infra_ci", "infra_cd", "app_ci", "app_cd", "opex_ci", "opex_cd"
        ], identity)
      ]) &&
      alltrue([
        for principal_id in readers.principal_ids : can(regex(
          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          lower(principal_id)
        ))
      ])
    ])
    error_message = "Each upstream must use a valid container reference and select at least one valid reader."
  }
}

variable "private_dns_zone_resource_group_id" {
  type        = string
  description = "The ID of the resource group containing private DNS zones."
}

variable "opex_resource_group_id" {
  type        = string
  description = "The ID of the resource group containing Opex dashboards."
}

variable "repository" {
  type = object({
    owner    = optional(string, "pagopa")
    name     = string
    owner_id = optional(number)
  })

  description = "Details about the GitHub repository. `owner` is the GitHub login or organization name; `owner_id` is the positive numeric GitHub owner ID used in immutable OIDC subjects. For personal-account repositories, set `owner_id` to `owner.id` from `GET /repos/{owner}/{repo}`."

  validation {
    condition = var.repository.owner_id == null ? true : (
      var.repository.owner_id > 0 &&
      floor(var.repository.owner_id) == var.repository.owner_id
    )
    error_message = "repository.owner_id must be a positive integer when set."
  }
}

variable "github_private_runner" {
  type = object({
    container_app_environment_id = string
    replica_timeout_in_seconds   = optional(number, 1800)
    polling_interval_in_seconds  = optional(number, 30)
    min_instances                = optional(number, 0)
    max_instances                = optional(number, 30)
    labels                       = optional(list(string), [])
    key_vault = object({
      name                = string
      resource_group_name = string
      secret_name         = optional(string, "github-runner-pat")
      use_rbac            = optional(bool, false)
    })
    use_github_app = optional(bool, false)
    cpu            = optional(number, 1.5)
    memory         = optional(string, "3Gi")
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
