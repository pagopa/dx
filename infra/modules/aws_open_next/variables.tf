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
    region          = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and region short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "custom_domain" {
  type = object({
    domain_name         = string
    acm_certificate_arn = string
    hosted_zone_id      = optional(string, null)
  })

  description = "Custom domain configuration. If not provided, the cloudfront default domain will be used. If the DNS zone is managed by AWS, the hosted_zone_id must be provided to create the Route53 record."
  default     = null
}

variable "node_major_version" {
  type        = string
  description = "The major version of the runtime to use for the lambda function. Allowed values are 20 or 22."
  default     = "22"

  # Validate that the major version is 20 or 22
  validation {
    condition     = contains(["20", "22"], var.node_major_version)
    error_message = "The major version must be one of the following: 20, 22"
  }
}

variable "vpc" {
  type = object({
    id              = string
    private_subnets = list(string)
  })
  default = null

  description = "The VPC used to deploy the lambda functions in. Configure this only when you want the lambda to access private resources contained in the VPC."
}


variable "server" {
  type = object({
    environment_variables = optional(map(string), {})
    lambda_layers         = optional(list(string), [])
  })

  description = "The server lambda function configuration."
  default = {
    environment_variables = {}
    lambda_layers         = []
  }
}

variable "enable_waf" {
  type        = bool
  description = "Whether to enable WAF for enhanced protection. Enable this for sensitive production environments. Be aware that enabling WAF will incur additional costs."
  default     = false
}

variable "custom_headers" {
  type = list(object({
    header   = string
    value    = string
    override = optional(bool)
  }))
  description = "Custom headers to be added to the CloudFront distribution."
  default     = []
}

variable "alarms_actions" {
  type        = list(string)
  description = "List of actions to perform when an alarm is triggered. This can include SNS topics, Lambda functions, etc. If empty, no actions will be performed."
  default     = []
}
