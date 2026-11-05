terraform {
  required_version = ">= 1.17.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

variable "project" {
  type = string
}

data "azurerm_subnet" "pep" {
  name                 = "${var.project}-pep-snet-01"
  virtual_network_name = "${var.project}-common-vnet-01"
  resource_group_name  = "${var.project}-network-rg-01"
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}
