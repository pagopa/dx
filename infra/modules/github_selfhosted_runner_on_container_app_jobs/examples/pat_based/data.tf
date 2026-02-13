data "azurerm_resource_group" "gh_runner" {
  name = "dx-d-itn-github-runner-rg-01"
}

data "azurerm_container_app_environment" "gh_runner" {
  name                = "dx-d-itn-github-runner-cae-01"
  resource_group_name = data.azurerm_resource_group.gh_runner.name
}
