module "open_next" {
  source = "../../modules/aws_open_next"

  environment = local.environment
  tags        = local.tags
}
