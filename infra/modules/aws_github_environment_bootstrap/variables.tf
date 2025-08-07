variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    region          = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and region short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })

  description = "Details about the GitHub repository, including owner and name."
}

variable "vpc" {
  type = object({
    id              = string
    private_subnets = list(string)
  })

  description = "The VPC used to deploy the resources"
}

variable "github_private_runner" {
  type = object({
    tier               = optional(string, "m")
    codeconnection_arn = optional(string, null)
    personal_access_token = optional(object({
      ssm_parameter_name = optional(string, null)
      value              = optional(string, null)
    }), null)
    env_variables = optional(map(string), {})
    secrets = map(object({
      ssm_parameter_name   = optional(string, null)
      secrets_manager_name = optional(string, null)
    }))
  })

  description = "Configuration for the GitHub self-hosted runner, including tier, code connection ARN, personal access token, environment variables, and secrets. Either codeconnection_arn or personal_access_token must be set, but not both."

  validation {
    condition = var.github_private_runner.personal_access_token == null || !alltrue([(try(var.github_private_runner.personal_access_token.ssm_parameter_name, null) != null), (try(var.github_private_runner.personal_access_token.value, null) != null)])

    error_message = "If the variable is set, either ssm_parameter_name or value must be set. Not both."
  }

  validation {
    condition = alltrue([
      for secret in values(var.github_private_runner.secrets) : (secret.ssm_parameter_name != null) != (secret.secrets_manager_name != null)
    ])

    error_message = "In secrets, either ssm_parameter_name or secrets_manager_name must be set. Not both."
  }
}
