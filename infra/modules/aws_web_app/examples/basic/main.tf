module "web_app" {
  source = "../../"

  environment = local.environment
  repository = {
    organization = "pagopa"
    name = "developer-portal"
    branch_name = "main"
  }

  github_authorization_type = "AWS"

  build_information = {
    app_path = "website"
    build_path = "website/build"
    install_commands = ["corepack enable", "yarn install --immutable"]
    build_commands = ["yarn workspace docs run build"]
  }

  # monitoring = {
  #   enabled = true
  #   target_emails = ["john.doe@example.it"]
  # }

  # custom_domain = {
  #   zone_name   = "dx.pagopa.it"
  #   zone_id     = "Z0*******************P"
  #   sub_domains = [""]
  # }

  tags = local.tags
}