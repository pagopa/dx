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

variable "custom_domain" {
  type = object({
    domain_name = string
    acm_certificate_arn = string
    hosted_zone_id = optional(string, null)
  })

  description = "Custom domain configuration. If not provided, the cloudfront default domain will be used. If the DNS zone is managed by AWS, the hosted_zone_id must be provided to create the Route53 record."
  default     = null
}

variable "node_major_version" {
  type        = string
  description = "The major version of the runtime to use for the lambda function. Allowed values are 18, 20 or 22."
  default     = "20"

  # Validate that the major version is 18, 20 or 22
  validation {
    condition     = contains(["18", "20", "22"], var.node_major_version)
    error_message = "The major version must be one of the following: 18, 20, 22"
  }
}

variable "vpc" {
  type = object({
    id              = string
    private_subnets = list(string)
  })

  description = "The VPC used to deploy the lambda functions in. Configure this only when you want the lambda to access private resources contained in the VPC."
}


variable "server" {
  type = object({
    timeout              = optional(number, 30)
    memory_size          = optional(number, 512)
    handler              = optional(string, "index.handler")
    environment_variables = optional(map(string), {})
  })

  description = "The server lambda function configuration."
  default     = {
    timeout              = 30
    memory_size          = 512
    handler              = "index.handler"
    environment_variables = {}
  }
}

variable "image_optimizer" {
  type = object({
    timeout              = optional(number, 30)
    memory_size          = optional(number, 512)
    handler              = optional(string, "index.handler")
    environment_variables = optional(map(string), {})
  })

  description = "The image optimizer lambda function configuration."
  default     = {
    timeout              = 30
    memory_size          = 512
    handler              = "index.handler"
    environment_variables = {}
  }
}

variable "enable_waf" {
  type        = bool
  description = "Whether to enable WAF for enhanced protection."
  default     = false
}

variable "custom_headers" {
  type        = list(object({
    header   = string
    value    = string
    override = optional(bool)
  }))
  description = "Custom headers to be added to the CloudFront distribution."
  default     = []
}
