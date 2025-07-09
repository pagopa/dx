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

  description = "The VPC used to deploy the lambda function in. Configure this only when you want the lambda to access private resources contained in the VPC."
  default     = null
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

variable "lambda_layers" {
  type        = list(string)
  description = "The list of Lambda layers to attach to the function. The default is an empty list."
  default     = []

}

variable "environment_variables" {
  type        = map(string)
  description = "The environment variables to set for the lambda function."
  default     = {}
}

variable "is_streaming_enabled" {
  type        = bool
  description = "Whether to use streaming for the server lambda function. If this is true, the wrapper override must be set to 'aws-lambda-streaming' in the 'open-next.config.ts'. More info at https://opennext.js.org/aws/config/simple_example#streaming-with-lambda. The default is false."
  default     = false
}

variable "assets_bucket" {
  type = object({
    name   = string
    arn    = string
    region = string
  })
  description = "The information of the S3 bucket where the OpenNext assets are stored."
}

variable "isr_tags_ddb" {
  type = object({
    name = string
    arn  = string
  })
  description = "The information of the DynamoDB table used for ISR revalidation."
}

variable "isr_queue" {
  type = object({
    name = string
    arn  = string
    url  = string
  })
  description = "The ARN and URL of the SQS queue used for ISR revalidation."
}


variable "enable_alarms" {
  type        = bool
  description = "Whether to enable CloudWatch alarms for the lambda function. "
  default     = false
}


variable "alarms_actions" {
  type        = list(string)
  description = "List of actions to perform when an alarm is triggered. This can include SNS topics, Lambda functions, etc. If empty, no actions will be performed."
  default     = []
}
