module "assets" {
  source = "./modules/assets"

  environment = var.environment
  tags        = local.tags
}

module "common" {
  source = "./modules/common"

  environment = var.environment
  tags        = local.tags
}

module "server" {
  source = "./modules/server_lambda"

  environment = var.environment
  tags        = local.tags

  node_major_version    = var.node_major_version
  environment_variables = var.server.environment_variables
  assets_bucket         = module.assets.bucket
  isr_tags_ddb          = module.isr_revalidation.ddb_tags_table
  isr_queue             = module.isr_revalidation.sqs_queue
  lambda_layers         = var.server.lambda_layers

  enable_alarms  = local.enable_alarms
  alarms_actions = var.alarms_actions

  vpc = var.vpc
}

module "image_optimizer" {
  source = "./modules/image_optimizer_lambda"

  environment = var.environment
  tags        = local.tags

  node_major_version = var.node_major_version
  assets_bucket      = module.assets.bucket
}

module "isr_revalidation" {
  source = "./modules/isr_revalidation"

  environment = var.environment
  tags        = local.tags

  node_major_version = var.node_major_version
}

module "initializer" {
  source = "./modules/initialization_lambda"

  environment = var.environment
  tags        = local.tags

  node_major_version = var.node_major_version

  isr_tags_ddb = module.isr_revalidation.ddb_tags_table
}

module "cloudfront" {
  source = "./modules/cloudfront"

  environment = var.environment
  tags        = local.tags

  enable_waf = var.enable_waf

  custom_domain = var.custom_domain

  custom_headers = var.custom_headers

  origins = {
    assets_bucket = {
      domain_name = module.assets.bucket.regional_domain_name
      oac         = module.assets.cloudfront_origin_access_control.id
    }
    server_function = {
      url = module.server.lambda_function.url
      oac = module.server.cloudfront_origin_access_control.id
    }
    image_optimization_function = {
      url = module.image_optimizer.lambda_function.url
      oac = module.image_optimizer.cloudfront_origin_access_control.id
    }
  }
}
