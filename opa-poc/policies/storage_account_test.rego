package storage_account_test

import data.main
import rego.v1

valid_storage := {
	"address": "azurerm_storage_account.ok",
	"type": "azurerm_storage_account",
	"change": {
		"actions": ["create"],
		"after": {
			"name": "dxditnplatformst01",
			"account_kind": "StorageV2",
			"min_tls_version": "TLS1_2",
			"https_traffic_only_enabled": true,
			"cross_tenant_replication_enabled": false,
			"public_network_access_enabled": false,
			"identity": [{"type": "SystemAssigned", "identity_ids": null}],
			"tags": {"ModuleSource": "raw", "Environment": "dev"},
		},
	},
}

with_after(overrides) := {
	"address": "azurerm_storage_account.bad",
	"type": "azurerm_storage_account",
	"change": {
		"actions": ["create"],
		"after": object.union(valid_storage.change.after, overrides),
	},
}

valid_function_storage := {
	"address": "azurerm_storage_account.func",
	"type": "azurerm_storage_account",
	"change": {
		"actions": ["create"],
		"after": {
			"name": "dxditnplatformpocstfn01",
			"account_kind": "StorageV2",
			"min_tls_version": "TLS1_2",
			"https_traffic_only_enabled": true,
			"cross_tenant_replication_enabled": false,
			"public_network_access_enabled": false,
			"identity": [],
			"tags": {"ModuleSource": "raw", "Environment": "dev"},
		},
	},
}

referencing_func := {
	"address": "azurerm_linux_function_app.ok",
	"type": "azurerm_linux_function_app",
	"change": {
		"actions": ["create"],
		"after": {
			"name": "dx-d-itn-platform-poc-func-01",
			"storage_account_name": "dxditnplatformpocstfn01",
		},
	},
}

test_compliant_yields_no_deny if {
	violations := [m | some m in main.deny with input as {"resource_changes": [valid_storage]}; startswith(m, "[storage:")]
	count(violations) == 0
}

test_delete_action_ignored if {
	deleted := {
		"address": "azurerm_storage_account.gone",
		"type": "azurerm_storage_account",
		"change": {"actions": ["delete"], "after": null},
	}
	count(main.deny) == 0 with input as {"resource_changes": [deleted]}
}

test_min_tls_required if {
	bad := with_after({"min_tls_version": "TLS1_0"})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:min_tls]")
}

test_https_only_required if {
	bad := with_after({"https_traffic_only_enabled": false})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:https_only]")
}

test_cross_tenant_forbidden if {
	bad := with_after({"cross_tenant_replication_enabled": true})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:cross_tenant]")
}

test_account_kind_required if {
	bad := with_after({"account_kind": "BlobStorage"})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:account_kind]")
}

test_public_network_forbidden if {
	bad := with_after({"public_network_access_enabled": true})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:public_network]")
}

test_identity_block_required if {
	bad := with_after({"identity": []})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:identity]")
}

test_identity_must_include_system_assigned if {
	bad := with_after({"identity": [{"type": "UserAssigned", "identity_ids": ["/foo"]}]})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:identity]")
}

test_function_backing_storage_does_not_require_identity if {
	violations := [m |
		some m in main.deny with input as {"resource_changes": [valid_function_storage, referencing_func]}
		startswith(m, "[storage:identity]")
	]
	count(violations) == 0
}

test_function_backing_storage_uses_function_storage_name_shape if {
	violations := [m |
		some m in main.deny with input as {"resource_changes": [valid_function_storage, referencing_func]}
		startswith(m, "[storage:naming]")
	]
	count(violations) == 0
}

test_naming_required if {
	bad := with_after({"name": "totallywrong"})
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:naming]")
}

test_module_source_tag_required if {
	bad_after := json.remove(valid_storage.change.after, ["tags/ModuleSource"])
	bad := {
		"address": "azurerm_storage_account.bad",
		"type": "azurerm_storage_account",
		"change": {"actions": ["create"], "after": bad_after},
	}
	some msg in main.deny with input as {"resource_changes": [bad]}
	startswith(msg, "[storage:tag_module_source]")
}
