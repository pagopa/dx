locals {
  bedrock_model_arn       = "arn:aws:bedrock:${var.naming_config.region}:${var.account_id}:inference-profile/eu.${var.bedrock_model_id}"
  bedrock_model_local_arn = "arn:aws:bedrock:eu-*::foundation-model/${var.bedrock_model_id}"
}
