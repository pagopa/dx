#---------#
# General #
#---------#

variable "tags" {
  type        = map(any)
  description = "Resources tags"
  default     = {}
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

variable "docker_image" {
  type        = string
  description = "The docker image to be used in the self-hosted runner. If not set, the default image will be used."
  default     = null
}

variable "tier" {
  type        = string
  description = "Resource tiers depending on build requirements. Allowed values are 's', 'm', 'l'."

  default = "m"

  validation {
    condition     = contains(["s", "m", "l"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", \"l\"."
  }
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })

  description = "Source repository information"
}

variable "build_timeout" {
  type        = number
  description = "The timeout for the build process in minutes"
  default     = 480
}

variable "vpc" {
  type = object({
    id              = string
    private_subnets = list(string)
  })

  description = "The VPC used to deploy the resources"
}

variable "name" {
  type        = string
  description = "The name of the codebuild project. If not set, the name will be generated using the environment variable. This is useful when you want to customize the runner label."
  default     = null
}

variable "codeconnection_arn" {
  type        = string
  description = "The ARN of the CodeConnection connection. One of personal_access_token or codeconnection_arn must be set. Please, make sure that one has already been installed in your repository (See how: https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html)."
  default     = null
}

variable "personal_access_token" {
  type = object({
    ssm_parameter_name = optional(string, null)
    value              = optional(string, null)
  })
  description = "GitHub personal access token used to authenticate. One of personal_access_token or codeconnection_arn must be set."
  sensitive   = true
  default     = null

  validation {
    condition = var.personal_access_token == null || !alltrue([(try(var.personal_access_token.ssm_parameter_name, null) != null), (try(var.personal_access_token.value, null) != null)])

    error_message = "If the variable is set, either ssm_parameter_name or value must be set. Not both."
  }
}

variable "env_variables" {
  type        = map(string)
  description = "Build environment variables. These are intended as an addition to the ones specified in the GitHub environment."
  default     = {}
}

variable "secrets" {
  type = map(object({
    ssm_parameter_name   = optional(string, null)
    secrets_manager_name = optional(string, null)
  }))

  description = "Secrets to be used in the build environment. The key is the name of the environment variable, and the value is the name of the SSM parameter or Secrets Manager secret. These are intended as an addition to the ones specified in the GitHub environment."
  default     = {}

  validation {
    condition = alltrue([
      for secret in values(var.secrets) : (secret.ssm_parameter_name != null) != (secret.secrets_manager_name != null)
    ])

    error_message = "Either ssm_parameter_name or secrets_manager_name must be set. Not both."
  }
}
