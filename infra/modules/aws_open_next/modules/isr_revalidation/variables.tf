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

variable "node_major_version" {
  type        = string
  description = "The major version of the runtime to use for the lambda function. Allowed values are 20 or 22."
  default     = "20"

  # Validate that the major version is 20 or 22
  validation {
    condition     = contains(["20", "22"], var.node_major_version)
    error_message = "The major version must be one of the following: 20, 22"
  }
}

variable "handler" {
  type        = string
  description = "The function entrypoint in your code. The format is <filename>.<function_name>. For example, if your code is in a file called index.js and the function name is handler, the value should be index.handler."
  default     = "index.handler"

  validation {
    condition     = can(regex("^[a-zA-Z0-9_]+\\.[a-zA-Z0-9_]+$", var.handler))
    error_message = "The handler must be in the format <filename>.<function_name>."
  }
}

variable "memory_size" {
  type        = number
  description = "The amount of memory available to the function at runtime in MB. The default is 1024 MB. The maximum is 10240 MB."
  default     = 1024

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "The memory size must be between 128 and 10240 MB."
  }
}

variable "timeout" {
  type        = number
  description = "The maximum execution time for the function. The default is 30 seconds. The maximum is 900 seconds."
  default     = 30

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "The timeout must be between 1 and 900 seconds."
  }
}

variable "environment_variables" {
  type        = map(string)
  description = "The environment variables to set for the lambda function."
  default     = {}
}
