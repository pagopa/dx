#---------#
# General #
#---------#

variable "tags" {
  type        = map(any)
  description = "Resources tags"
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

variable "repository" {
  type = object({
    organization = string
    name         = string
    branch_name  = string
  })

  description = "Source repository information"
}

variable "build_information" {
  type = object({
    app_path         = string       # e.g. "apps/mywebsite"
    build_path       = string       # e.g. "apps/mywebsite/.next"
    install_commands = list(string) # e.g. ["npm install"]
    build_commands   = list(string) # e.g. ["npm run compile", "npm run build -w mywebsite"]
  })
}

variable "github_authorization_type" {
  type        = string
  description = "Authorization can be done via GitHub PAT or AWS Codeconnection. Valid values are `PAT`, `AWS`. If a Codeconnection is not present in your AWS account, use the create_codeconnection variable to create one."

  validation {
    condition     = contains(["PAT", "AWS"], var.github_authorization_type)
    error_message = "The variable `github_authorization_type` must be one of `PAT`, `AWS`."
  }
}

variable "create_codeconnection" {
  type        = bool
  description = "If a codeconnection creation is requested please note that, after apply, it will also need a manual configuration from the AWS console to work."
  default     = false
}

variable "github_pat" {
  type        = string
  description = "GitHub PAT to use for authentication as an alternative to AWS Codeconnection."
  sensitive   = true
  default     = null
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for the application"
  default     = {}
}

variable "secrets" {
  type = list(object({
    name  = string
    value = optional(string, "Fill the value in the AWS console")
  }))
  default     = []
  description = "Secrets for the application. The value is optional to allow setting it manually via AWS console."
}

variable "is_ssr" {
  type        = bool
  description = "Set to true if the application is a server-side rendered application"
  default     = false
}

variable "custom_domain" {
  type = object({
    name        = string
    zone_id     = string
    sub_domains = optional(list(string), [])
  })

  default     = null
  description = "Custom domain configuration. Sub domains are optional and in the form of dev (dev.example.com), test (test.example.com), etc."
}

variable "monitoring" {
  type = object({
    enabled       = bool,
    target_emails = list(string)
  })

  description = "Monitoring configuration"
}

variable "redirect_rules" {
  type = list(object({
    source = string
    status = optional(string, null)
    target = string
  }))
  default     = []
  description = "Redirect rules for the application. A default one is automatically created to redirect all 404s to index.html. Read the [configuration guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_app#custom_rule-block) to add more."
}