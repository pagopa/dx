variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "devex"
    app_name        = "core"
    instance_number = "01"
  }

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  core_state = {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.uat.tfstate"
  }

  resource_group_ids = [
    "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-test-rg-01",
  ]

  tags = {
    Test = "true"
  }
}

mock_provider "azurerm" {}
mock_provider "azuread" {}
mock_provider "github" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_subscription.current

  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "11111111-1111-1111-1111-111111111111"
  }
}

override_data {
  target = data.azurerm_client_config.current

  values = {
    client_id       = "22222222-2222-2222-2222-222222222222"
    object_id       = "33333333-3333-3333-3333-333333333333"
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "11111111-1111-1111-1111-111111111111"
  }
}

override_module {
  target = module.core_values

  outputs = {
    common_key_vault = {
      id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-common-rg-01/providers/Microsoft.KeyVault/vaults/dx-u-itn-common-kv-01"
      name                = "dx-u-itn-common-kv-01"
      resource_group_name = "dx-u-itn-common-rg-01"
    }
    common_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-common-rg-01"
    github_runner = {
      environment_id      = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-github-runner-rg-01/providers/Microsoft.App/managedEnvironments/dx-u-itn-github-runner-cae-01"
      resource_group_name = "dx-u-itn-github-runner-rg-01"
      subnet_id           = null
    }
    network_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-network-rg-01"
    opex_resource_group_id    = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"
    test_resource_group_id    = null
  }
}

override_module {
  target = module.bootstrap

  outputs = {
    identities = {
      app = {
        ci = {
          client_id    = "77777777-7777-7777-7777-777777777771"
          id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01/providers/Microsoft.ManagedIdentity/userAssignedIdentities/app-ci"
          name         = "app-ci"
          principal_id = "77777777-7777-7777-7777-777777777772"
        }
        cd = {
          client_id    = "77777777-7777-7777-7777-777777777773"
          id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01/providers/Microsoft.ManagedIdentity/userAssignedIdentities/app-cd"
          name         = "app-cd"
          principal_id = "77777777-7777-7777-7777-777777777774"
        }
      }
      infra = {
        ci = {
          client_id    = "77777777-7777-7777-7777-777777777775"
          id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01/providers/Microsoft.ManagedIdentity/userAssignedIdentities/infra-ci"
          name         = "infra-ci"
          principal_id = "77777777-7777-7777-7777-777777777776"
        }
        cd = {
          client_id    = "77777777-7777-7777-7777-777777777777"
          id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01/providers/Microsoft.ManagedIdentity/userAssignedIdentities/infra-cd"
          name         = "infra-cd"
          principal_id = "77777777-7777-7777-7777-777777777778"
        }
      }
      opex = {
        ci = {
          client_id    = "77777777-7777-7777-7777-777777777779"
          id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01/providers/Microsoft.ManagedIdentity/userAssignedIdentities/opex-ci"
          name         = "opex-ci"
          principal_id = "77777777-7777-7777-7777-777777777780"
        }
        cd = {
          client_id    = "77777777-7777-7777-7777-777777777781"
          id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01/providers/Microsoft.ManagedIdentity/userAssignedIdentities/opex-cd"
          name         = "opex-cd"
          principal_id = "77777777-7777-7777-7777-777777777782"
        }
      }
    }
    resource_group = {
      id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-bootstrap-rg-01"
      location = "italynorth"
      name     = "dx-u-itn-bootstrap-rg-01"
    }
    subscription_id = "00000000-0000-0000-0000-000000000000"
  }
}

override_module {
  target  = module.roles_ci
  outputs = {}
}

override_module {
  target  = module.roles_cd
  outputs = {}
}

run "canonical_domainless_group_names" {
  command = plan

  override_data {
    target = data.azuread_group.admins

    values = {
      display_name = "dx-u-adgroup-admins"
      object_id    = "44444444-4444-4444-4444-444444444444"
    }
  }

  override_data {
    target = data.azuread_group.developers

    values = {
      display_name = "dx-u-adgroup-developers"
      object_id    = "55555555-5555-5555-5555-555555555555"
    }
  }

  override_data {
    target = data.azuread_group.externals

    values = {
      display_name = "dx-u-adgroup-externals"
      object_id    = "66666666-6666-6666-6666-666666666666"
    }
  }

  assert {
    condition     = local.adgroups.admins_name == "dx-u-adgroup-admins"
    error_message = "The default Entra admins group must use the plural canonical suffix"
  }

  assert {
    condition     = local.adgroups.devs_name == "dx-u-adgroup-developers"
    error_message = "The default Entra developers group must use the canonical suffix"
  }

  assert {
    condition     = local.adgroups.external_name == "dx-u-adgroup-externals"
    error_message = "The default Entra externals group must use the canonical suffix"
  }

  assert {
    condition     = data.azuread_group.admins.display_name == local.adgroups.admins_name
    error_message = "The admins lookup must use the canonical group name"
  }

  assert {
    condition     = data.azuread_group.developers.display_name == local.adgroups.devs_name
    error_message = "The developers lookup must use the canonical group name"
  }

  assert {
    condition     = data.azuread_group.externals.display_name == local.adgroups.external_name
    error_message = "The externals lookup must use the canonical group name"
  }
}

run "canonical_domain_specific_group_names" {
  command = plan

  variables {
    entraid_group_domain = "payments"
  }

  override_data {
    target = data.azuread_group.admins

    values = {
      display_name = "dx-u-payments-adgroup-admins"
      object_id    = "44444444-4444-4444-4444-444444444444"
    }
  }

  override_data {
    target = data.azuread_group.developers

    values = {
      display_name = "dx-u-payments-adgroup-developers"
      object_id    = "55555555-5555-5555-5555-555555555555"
    }
  }

  override_data {
    target = data.azuread_group.externals

    values = {
      display_name = "dx-u-payments-adgroup-externals"
      object_id    = "66666666-6666-6666-6666-666666666666"
    }
  }

  assert {
    condition     = local.adgroups.admins_name == "dx-u-payments-adgroup-admins"
    error_message = "An explicit group governance domain must be inserted before adgroup"
  }

  assert {
    condition     = local.adgroups.devs_name == "dx-u-payments-adgroup-developers"
    error_message = "An explicit group governance domain must apply to developers"
  }

  assert {
    condition     = local.adgroups.external_name == "dx-u-payments-adgroup-externals"
    error_message = "An explicit group governance domain must apply to externals"
  }

  assert {
    condition     = data.azuread_group.admins.display_name == local.adgroups.admins_name
    error_message = "The domain-specific admins lookup must use the canonical group name"
  }

  assert {
    condition     = data.azuread_group.developers.display_name == local.adgroups.devs_name
    error_message = "The domain-specific developers lookup must use the canonical group name"
  }

  assert {
    condition     = data.azuread_group.externals.display_name == local.adgroups.external_name
    error_message = "The domain-specific externals lookup must use the canonical group name"
  }
}
