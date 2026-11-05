variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    instance_number = "01"
  }
  resource_group_name = "rg-test"
  repository          = { name = "dx" }
  subscription_id     = "/subscriptions/00000000-0000-0000-0000-000000000000"
  tags                = {}
}

mock_provider "azurerm" {
  mock_data "azurerm_resource_group" {
    defaults = {
      id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test"
      name = "rg-test"
    }
  }
}
mock_provider "dx" {}

run "federated_identity_rejects_unknown_identity_type" {
  command = plan
  variables { identity_type = "unknown" }
  expect_failures = [var.identity_type]
}

run "federated_identity_rejects_partial_immutable_ids" {
  command = plan
  variables {
    repository = {
      name     = "dx"
      owner_id = "57742367"
    }
  }
  expect_failures = [var.repository]
}
