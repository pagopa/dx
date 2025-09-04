# S3 Backend (AWS)
data "terraform_remote_state" "core" {
  count   = local.backend_type == "s3" ? 1 : 0
  backend = "s3"

  config = {
    bucket         = var.core_state.bucket
    key            = var.core_state.key
    region         = var.core_state.region
    dynamodb_table = var.core_state.dynamodb_table
  }
}

# Azure Storage Backend
data "terraform_remote_state" "core_azure" {
  count   = local.backend_type == "azurerm" ? 1 : 0
  backend = "azurerm"

  config = {
    resource_group_name  = var.core_state.resource_group_name
    storage_account_name = var.core_state.storage_account_name
    container_name       = var.core_state.container_name
    key                  = var.core_state.key
  }
}
