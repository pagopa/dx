package function_app_test

import data.main
import rego.v1

valid_func := {
	"address": "azurerm_linux_function_app.ok",
	"type": "azurerm_linux_function_app",
	"change": {
		"actions": ["create"],
		"after": {
			"name": "dx-d-itn-platform-func-01",
			"https_only": true,
			"public_network_access_enabled": false,
			"storage_uses_managed_identity": true,
			"virtual_network_subnet_id": "/subscriptions/x/resourceGroups/r/providers/Microsoft.Network/virtualNetworks/v/subnets/s",
			"identity": [{"type": "SystemAssigned", "identity_ids": null}],
			"site_config": [{
				"always_on": true,
				"http2_enabled": true,
				"ip_restriction_default_action": "Deny",
				"minimum_tls_version": "1.2",
			}],
			"tags": {},
		},
	},
}

with_after(overrides) := {
	"address": "azurerm_linux_function_app.bad",
	"type": "azurerm_linux_function_app",
	"change": {
		"actions": ["create"],
		"after": object.union(valid_func.change.after, overrides),
	},
}

test_compliant_yields_no_deny if {
	violations := [m | some m in main.deny with input as {"resource_changes": [valid_func]}; startswith(m, "[func:")]
	count(violations) == 0
}

test_https_only_required if {
	bad := with_after({"https_only": false})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:https_only]")
}

test_public_network_forbidden if {
	bad := with_after({"public_network_access_enabled": true})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:public_network]")
}

test_storage_msi_required if {
	bad := with_after({"storage_uses_managed_identity": false})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:storage_msi]")
}

test_vnet_integration_required if {
	bad := with_after({"virtual_network_subnet_id": ""})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:vnet_integration]")
}

test_unknown_vnet_integration_is_allowed if {
	unknown := {
		"address": "azurerm_linux_function_app.unknown",
		"type": "azurerm_linux_function_app",
		"change": {
			"actions": ["create"],
			"after": json.remove(valid_func.change.after, ["virtual_network_subnet_id"]),
			"after_unknown": {"virtual_network_subnet_id": true},
		},
	}
	violations := [m | some m in main.deny with input as {"resource_changes": [unknown]}; startswith(m, "[func:")]
	count(violations) == 0
}

test_identity_required if {
	bad := with_after({"identity": []})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:identity]")
}

test_always_on_required if {
	bad := with_after({"site_config": [{
		"always_on": false,
		"http2_enabled": true,
		"ip_restriction_default_action": "Deny",
		"minimum_tls_version": "1.2",
	}]})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:always_on]")
}

test_ip_default_must_deny if {
	bad := with_after({"site_config": [{
		"always_on": true,
		"http2_enabled": true,
		"ip_restriction_default_action": "Allow",
		"minimum_tls_version": "1.2",
	}]})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:ip_default_deny]")
}

test_min_tls_required if {
	bad := with_after({"site_config": [{
		"always_on": true,
		"http2_enabled": true,
		"ip_restriction_default_action": "Deny",
		"minimum_tls_version": "1.0",
	}]})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:min_tls]")
}

test_naming_required if {
	bad := with_after({"name": "wrong-name"})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[func:naming]")
}
