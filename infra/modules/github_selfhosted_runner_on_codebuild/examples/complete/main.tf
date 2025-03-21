module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.app_prefix}-vpc-${local.app_suffix}"
  cidr = "10.0.0.0/16"

  azs             = ["eu-south-1a", "eu-south-1b", "eu-south-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # For development environments

  tags = local.tags
}

module "runner" {
  source      = "../../"
  environment = local.environment

  tier = "m"
  repository = {
    owner = "pagopa"
    name  = "developer-portal"
  }

  vpc = {
    id              = module.vpc.vpc_id
    private_subnets = module.vpc.private_subnets
  }

  # personal_access_token = {
  #   ssm_parameter_name = "/github/runner/token"
  # }

  env_variables = {
    ENV_SHORT = local.environment.env_short
  }

  # secrets = {
  #   DB_URL = { ssm_parameter_name = "/db/url" },
  #   DB_USERNAME = { ssm_parameter_name = "/db/username" },
  #   DB_PASSWORD = { ssm_parameter_name = "/db/password" }
  # }

  tags = local.tags
}

resource "aws_security_group" "db" {
  name        = "${local.app_prefix}-db-sg-${local.app_suffix}"
  description = "Example security group of a postgres database"
  vpc_id      = module.vpc.vpc_id

  # https://registry.terraform.io/providers/hashicorp/aws/5.35.0/docs/resources/security_group#recreating-a-security-group
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "codebuild_db_ingress" {
  type                     = "ingress"
  description              = "Allow codebuild to connect to the database"
  from_port                = 5432 # Suppose it's a postgres
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = module.runner.security_group.id
}