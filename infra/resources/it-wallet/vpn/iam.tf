# resource "azuread_application" "vpn_app_01" {
#   display_name = "${local.project}-vpn-app-01"
#   owners       = [data.azurerm_client_config.current.object_id]

#   api {
#     mapped_claims_enabled          = false
#     requested_access_token_version = 1

#     oauth2_permission_scope {
#       admin_consent_description  = "trial-p-app-vpn"
#       admin_consent_display_name = "trial-p-app-vpn"
#       id                         = "a1c1ceef-5db1-7eb6-49b1-a8828702476f"
#       enabled                    = true
#       type                       = "Admin"
#       value                      = "trial-p-app-vpn"
#     }
#   }
# }
