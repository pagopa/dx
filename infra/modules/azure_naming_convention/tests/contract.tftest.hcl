variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }
}

run "naming_convention_rejects_invalid_prefix" {
  command = plan
  variables { environment = { prefix = "x", env_short = "d", location = "italynorth", domain = "modules", app_name = "test", instance_number = "01" } }
  expect_failures = [var.environment]
}

run "naming_convention_rejects_invalid_environment" {
  command = plan
  variables { environment = { prefix = "dx", env_short = "x", location = "italynorth", domain = "modules", app_name = "test", instance_number = "01" } }
  expect_failures = [var.environment]
}

run "naming_convention_rejects_invalid_location" {
  command = plan
  variables { environment = { prefix = "dx", env_short = "d", location = "eastus", domain = "modules", app_name = "test", instance_number = "01" } }
  expect_failures = [var.environment]
}

run "naming_convention_rejects_short_domain" {
  command = plan
  variables { environment = { prefix = "dx", env_short = "d", location = "italynorth", domain = "x", app_name = "test", instance_number = "01" } }
  expect_failures = [var.environment]
}

run "naming_convention_rejects_short_application_name" {
  command = plan
  variables { environment = { prefix = "dx", env_short = "d", location = "italynorth", domain = "modules", app_name = "x", instance_number = "01" } }
  expect_failures = [var.environment]
}

run "naming_convention_rejects_invalid_instance_number" {
  command = plan
  variables { environment = { prefix = "dx", env_short = "d", location = "italynorth", domain = "modules", app_name = "test", instance_number = "00" } }
  expect_failures = [var.environment]
}
