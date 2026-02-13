variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where the Container App Job will be deployed. Defaults to null."
  default     = null
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })

  description = "Details of the GitHub repository, including the owner and repository name."
}

variable "container_app_environment" {
  type = object({
    id                          = string
    location                    = string
    replica_timeout_in_seconds  = optional(number, 1800)
    polling_interval_in_seconds = optional(number, 30)
    min_instances               = optional(number, 0)
    max_instances               = optional(number, 30)
    use_labels                  = optional(bool, false)
    override_labels             = optional(list(string), [])
    cpu                         = optional(number, 1.5)
    memory                      = optional(string, "3Gi")
    image                       = optional(string, "ghcr.io/pagopa/github-self-hosted-runner-azure:latest")
    env_vars                    = optional(map(string), {})
    secrets                     = optional(map(string), {})
  })

  description = "Configuration for the Container App Environment."
}

variable "key_vault" {
  type = object({
    name                        = string
    resource_group_name         = string
    use_rbac                    = optional(bool, false)
    secret_name                 = optional(string, "github-runner-pat")
    app_key_secret_name         = optional(string, null)
    app_id_secret_name          = optional(string, null)
    installation_id_secret_name = optional(string, null)
  })

  description = "Details of the Key Vault used to store GitHub credentials. Use 'secret_name' for PAT-based authentication (legacy) or 'app_key_secret_name', 'app_id_secret_name', and 'installation_id_secret_name' for GitHub App authentication (recommended)."

  validation {
    condition = (
      (var.key_vault.secret_name != null && var.key_vault.app_key_secret_name == null && var.key_vault.app_id_secret_name == null && var.key_vault.installation_id_secret_name == null) ||
      (var.key_vault.secret_name == null && var.key_vault.app_key_secret_name != null && var.key_vault.app_id_secret_name != null && var.key_vault.installation_id_secret_name != null)
    )
    error_message = "Either provide 'secret_name' for PAT-based authentication OR all three GitHub App credentials ('app_key_secret_name', 'app_id_secret_name', 'installation_id_secret_name'), but not both."
  }
}
