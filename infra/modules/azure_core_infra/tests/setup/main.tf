terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.62"
    }
  }
}

output "environment" {
  value = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "02"
  }
}
