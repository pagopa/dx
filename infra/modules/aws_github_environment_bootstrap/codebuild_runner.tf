module "github_runner" {
  source  = "pagopa-dx/github-selfhosted-runner-on-codebuild/aws"
  version = "~> 1.0"

  environment = var.environment
  tier        = var.github_private_runner.tier

  repository = {
    owner = var.repository.owner
    name  = var.repository.name
  }

  codeconnection_arn    = var.github_private_runner.codeconnection_arn
  personal_access_token = var.github_private_runner.personal_access_token

  env_variables = var.github_private_runner.env_variables
  secrets       = var.github_private_runner.secrets

  vpc = {
    id              = var.vpc.id
    private_subnets = var.vpc.private_subnets
  }
}
