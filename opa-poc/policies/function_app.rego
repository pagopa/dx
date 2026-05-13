# Linux function app compliance — extracted from infra/modules/azure_function_app/function_app.tf
# Each rule mirrors a hard-coded value or an argument that the module forces.
package main

import data.lib.naming
import rego.v1

function_apps contains r if {
	some r in input.resource_changes
	r.type == "azurerm_linux_function_app"
	some action in r.change.actions
	action != "delete"
}

func_has_vnet_integration(r) if {
	subnet := object.get(r.change.after, "virtual_network_subnet_id", null)
	subnet != null
	subnet != ""
}

func_has_vnet_integration(r) if {
	after_unknown := object.get(r.change, "after_unknown", {})
	object.get(after_unknown, "virtual_network_subnet_id", false) == true
}

# 1. https_only = true  (function_app.tf:13)
deny contains msg if {
	some r in function_apps
	r.change.after.https_only == false
	msg := sprintf("[func:https_only] %s: 'https_only' must be true", [r.address])
}

# 2. public_network_access_enabled = false  (function_app.tf:14)
deny contains msg if {
	some r in function_apps
	r.change.after.public_network_access_enabled == true
	msg := sprintf(
		"[func:public_network] %s: public network access must be disabled (use a private endpoint)",
		[r.address],
	)
}

# 3. storage_uses_managed_identity = true  (function_app.tf:10)
deny contains msg if {
	some r in function_apps
	r.change.after.storage_uses_managed_identity != true
	msg := sprintf(
		"[func:storage_msi] %s: 'storage_uses_managed_identity' must be true (no shared keys)",
		[r.address],
	)
}

# 4. virtual_network_subnet_id non-empty  (function_app.tf:15 — VNet integration is mandatory)
deny contains msg if {
	some r in function_apps
	not func_has_vnet_integration(r)
	msg := sprintf(
		"[func:vnet_integration] %s: 'virtual_network_subnet_id' is required (VNet integration mandatory)",
		[r.address],
	)
}

# 5. SystemAssigned identity required  (function_app.tf:18)
deny contains msg if {
	some r in function_apps
	identities := object.get(r.change.after, "identity", [])
	count(identities) == 0
	msg := sprintf("[func:identity] %s: a SystemAssigned identity block is required", [r.address])
}

deny contains msg if {
	some r in function_apps
	identities := object.get(r.change.after, "identity", [])
	count(identities) > 0
	some i in identities
	not contains(i.type, "SystemAssigned")
	msg := sprintf(
		"[func:identity] %s: identity type must include 'SystemAssigned' (got: %v)",
		[r.address, i.type],
	)
}

# 6. site_config.always_on = true  (function_app.tf:24)
deny contains msg if {
	some r in function_apps
	some sc in r.change.after.site_config
	sc.always_on == false
	msg := sprintf("[func:always_on] %s: 'site_config.always_on' must be true", [r.address])
}

# 7. site_config.ip_restriction_default_action = "Deny"  (function_app.tf:30)
deny contains msg if {
	some r in function_apps
	some sc in r.change.after.site_config
	sc.ip_restriction_default_action != "Deny"
	msg := sprintf(
		"[func:ip_default_deny] %s: 'site_config.ip_restriction_default_action' must be 'Deny' (got: %v)",
		[r.address, sc.ip_restriction_default_action],
	)
}

# 8. site_config.minimum_tls_version >= 1.2  (function_app.tf:32)
allowed_tls := {"1.2", "1.3"}

deny contains msg if {
	some r in function_apps
	some sc in r.change.after.site_config
	not sc.minimum_tls_version in allowed_tls
	msg := sprintf(
		"[func:min_tls] %s: 'site_config.minimum_tls_version' must be 1.2 or higher (got: %v)",
		[r.address, sc.minimum_tls_version],
	)
}

# 9. Naming convention shape check.
deny contains msg if {
	some r in function_apps
	name := r.change.after.name
	not naming.shape_ok("function_app", name)
	msg := sprintf("[func:naming] %s: name '%s' does not match the function app naming pattern", [r.address, name])
}
