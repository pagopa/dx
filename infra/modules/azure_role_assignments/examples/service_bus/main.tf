resource "azurerm_resource_group" "example" {
  name     = "${local.resource_prefix}-rg-${local.environment.instance_number}"
  location = "Italy North"
}

module "app_service_exposed" {
  source      = "../../../azure_app_service_exposed"
  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  health_check_path   = "/api/v1/info"

  app_settings      = {}
  slot_app_settings = {}

  tier = "test"

  tags = local.tags
}

module "roles" {
  source          = "../../"
  principal_id    = module.app_service_exposed.app_service.app_service.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = "dx-d-itn-playground-sb-01"
      resource_group_name = "dx-d-itn-test-rg-01"
      role                = "reader"
      description         = "This is a reader"
      queue_names         = ["test-queue"]
      subscriptions = {
        test-topic = "test-sub"
      }
    }
  ]
}
