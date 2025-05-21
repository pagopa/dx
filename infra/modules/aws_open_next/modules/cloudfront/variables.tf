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
    domain_name       = string
    hosted_zone_id    = string
    acm_certificate_arn   = string
  })

  description = "Custom domain information."
  default     = null
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

variable "origins" {
  type = object({
    assets_bucket = object({
      domain_name = string
      oai  = string
    })
    server_function = object({
      url = string
      oac = string
    })
    image_optimization_function = object({
      url = string
      oac = string
    })
  })
}

variable "enable_waf" {
  type        = bool
  description = "Enable WAF for CloudFront distribution."
  default     = false
}
