module "cosmos" {
  source = "./modules/cosmos"

  principal_id = var.principal_id
  cosmos       = var.cosmos
}

module "event_hub" {
  source = "./modules/event_hub"

  principal_id = var.principal_id
  event_hub    = var.event_hub
}

module "key_vault" {
  source = "./modules/key_vault"

  principal_id = var.principal_id
  key_vault    = var.key_vault
}

module "redis" {
  source = "./modules/redis"

  principal_id = var.principal_id
  redis        = var.redis
}

module "storage_account" {
  source = "./modules/storage_account"

  principal_id  = var.principal_id
  storage_blob  = var.storage_blob
  storage_queue = var.storage_queue
  storage_table = var.storage_table
}