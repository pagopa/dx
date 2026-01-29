# ============================================================================
# TERRAFORM CONFIGURATION & PROVIDER SETUP
# ============================================================================
# Purpose: Configure Terraform version requirements and Azure provider
# This example demonstrates merging multiple Azure built-in roles into a
# custom role definition

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}
