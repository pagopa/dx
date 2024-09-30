# ------------ GENERAL ------------ #
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

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

# ------------ STORAGE ACCOUNT ------------ #

variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "subservices" {
  type = object({
    blob = optional(bool, true)
    file = optional(bool, false)
    queue = optional(bool, false)
    table = optional(bool, false)
  })
}

variable "network_rules" {
  type = object({
    default_action             = string       # Specifies the default action of allow or deny when no other rules match. Valid options are Deny or Allow
    bypass                     = set(string)  # Specifies whether traffic is bypassed for Logging/Metrics/AzureServices. Valid options are any combination of Logging, Metrics, AzureServices, or None
    ip_rules                   = list(string) # List of public IP or IP ranges in CIDR Format. Only IPV4 addresses are allowed
    virtual_network_subnet_ids = list(string) # A list of resource ids for subnets.
  })
  default = null
}

variable "action_group_id" {
  type        = string
  description = "Set the Action Group Id to invoke when the Storage Account alert triggers"
  default     = null
}
