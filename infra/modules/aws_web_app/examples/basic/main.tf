module "web_app" {
  source = "../../"

  environment = local.environment
  repository = {
    organization = "pagopa"
    name = "dx"
    branch_name = "main"
  }

  github_authorization_type = "PAT"
  github_pat = var.github_pat

  build_information = {
    app_path = "website"
    build_path = "website/hello-world/.next"
    install_commands = ["yarn install"]
    build_commands = ["yarn build -w website"]
  }

  tags = local.tags
}