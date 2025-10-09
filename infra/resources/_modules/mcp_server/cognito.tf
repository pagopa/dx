# --- Cognito User Pool for MCP Server users ---

# The user pool is the user directory that will contain all users.
# We are configuring it to allow sign-in only through external identity providers (like Google).
resource "aws_cognito_user_pool" "mcp_server" {
  name = "${var.naming_config.prefix}-mcp-server"

  # Only allow sign-in with external providers, not with username/password.
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = false
    require_symbols   = true
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {}
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {}
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = var.tags
}

# --- Google as an Identity Provider ---

# This resource connects the user pool to your Google OAuth 2.0 application.
# When a user tries to sign in, Cognito will redirect them to Google.
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.mcp_server.id
  provider_name = "Google"
  provider_type = "Google"

  # These details come from your Google Cloud OAuth 2.0 Client ID credentials.
  provider_details = {
    client_id        = data.aws_ssm_parameter.gsuite_oauth_client_id.value
    client_secret    = data.aws_ssm_parameter.gsuite_oauth_client_secret.value
    authorize_scopes = "openid email profile offline_access"
  }

  # Map Google's user attributes to Cognito's user attributes.
  attribute_mapping = {
    email = "email"
    name  = "name"
  }
}


# --- Resource Server (API) ---
resource "aws_cognito_resource_server" "mcp_api" {
  user_pool_id = aws_cognito_user_pool.mcp_server.id
  identifier   = "https://api.dev.dx.pagopa.it/mcp"
  name         = "MCP API"

  scope {
    scope_name        = "read"
    scope_description = "Read access to MCP API"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access to MCP API"
  }
}


# --- User Pool Client ---

# The app client represents the application that will interact with Cognito.
# It is configured with callback URLs and the allowed OAuth flows.
resource "aws_cognito_user_pool_client" "mcp_server" {
  name         = "${var.naming_config.prefix}-mcp-server-client"
  user_pool_id = aws_cognito_user_pool.mcp_server.id

  # The client generates its own secret for added security.
  generate_secret = true

  # Allowed OAuth flows. "code" is for Authorization Code Grant.
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = [
    "openid",
    "email",
    "profile",
    "${aws_cognito_resource_server.mcp_api.identifier}/read",
    "${aws_cognito_resource_server.mcp_api.identifier}/write"
  ]

  # URLs where Cognito can redirect the user after sign-in/sign-out.
  # These must match the URLs configured in your client application.
  callback_urls                = var.cognito_config.callback_urls
  logout_urls                  = var.cognito_config.logout_urls
  supported_identity_providers = ["Google"]

  # Security configurations
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  # Rimuovo i flussi di autenticazione Cognito per impedire login con username/password

  # Token validity settings
  refresh_token_validity = 30
  access_token_validity  = 1
  id_token_validity      = 1
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}


# --- Cognito Custom Domain ---
# Per usare un dominio personalizzato per la UI di login Cognito, serve un certificato ACM validato nella stessa regione del pool.
resource "aws_acm_certificate" "cognito_custom" {
  provider          = aws.us-east-1
  domain_name       = "auth.${var.dns.custom_domain_name}"
  validation_method = "DNS"
  tags              = var.tags
}

resource "aws_cognito_user_pool_domain" "custom" {
  domain          = "auth.${var.dns.custom_domain_name}"
  user_pool_id    = aws_cognito_user_pool.mcp_server.id
  certificate_arn = aws_acm_certificate.cognito_custom.arn
}
