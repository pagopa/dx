package cross_resource_test

import data.main
import rego.v1

mk_storage(name) := {
	"address": sprintf("azurerm_storage_account.%s", [name]),
	"type": "azurerm_storage_account",
	"change": {"actions": ["create"], "after": {
		"name": name,
		"account_kind": "StorageV2",
		"min_tls_version": "TLS1_2",
		"https_traffic_only_enabled": true,
		"cross_tenant_replication_enabled": false,
		"public_network_access_enabled": false,
		"identity": [{"type": "SystemAssigned", "identity_ids": null}],
		"tags": {"ModuleSource": "raw"},
	}},
}

mk_func(name, storage_name) := {
	"address": sprintf("azurerm_linux_function_app.%s", [name]),
	"type": "azurerm_linux_function_app",
	"change": {"actions": ["create"], "after": {
		"name": name,
		"storage_account_name": storage_name,
		"https_only": true,
		"public_network_access_enabled": false,
		"storage_uses_managed_identity": true,
		"virtual_network_subnet_id": "/subscriptions/x/.../subnets/s",
		"identity": [{"type": "SystemAssigned", "identity_ids": null}],
		"site_config": [{
			"always_on": true,
			"http2_enabled": true,
			"ip_restriction_default_action": "Deny",
			"minimum_tls_version": "1.2",
		}],
		"tags": {},
	}},
}

mk_pep(name, target) := {
	"address": sprintf("azurerm_private_endpoint.%s", [name]),
	"type": "azurerm_private_endpoint",
	"change": {"actions": ["create"], "after": {
		"name": name,
		"private_service_connection": [{"private_connection_resource_id": target}],
	}},
}

# A complete, internally-consistent plan: 1 storage with PEP, 1 function with
# PEP-backed storage.
complete_plan := {"resource_changes": [
	mk_storage("dxditnplatformst01"),
	mk_pep("st_blob", "/.../storageAccounts/dxditnplatformst01/blob"),
	mk_func("dx-d-itn-platform-func-01", "dxditnplatformst01"),
]}

test_complete_plan_yields_no_xref_deny if {
	violations := [m | some m in main.deny with input as complete_plan; startswith(m, "[xref:")]
	count(violations) == 0
}

test_real_plan_style_references_yield_no_xref_deny if {
	plan := {
		"resource_changes": [
			mk_storage("dxditnplatformst01"),
			mk_pep("st_blob", null),
			mk_func("dx-d-itn-platform-func-01", "dxditnplatformst01"),
		],
		"configuration": {"root_module": {"resources": [
			{
				"address": "azurerm_storage_account.dxditnplatformst01",
				"type": "azurerm_storage_account",
				"expressions": {},
			},
			{
				"address": "azurerm_private_endpoint.st_blob",
				"type": "azurerm_private_endpoint",
				"expressions": {"private_service_connection": [{"private_connection_resource_id": {"references": [
					"azurerm_storage_account.dxditnplatformst01.id",
					"azurerm_storage_account.dxditnplatformst01",
				]}}]},
			},
			{
				"address": "azurerm_linux_function_app.dx-d-itn-platform-func-01",
				"type": "azurerm_linux_function_app",
				"expressions": {},
			},
		]}},
	}
	violations := [m | some m in main.deny with input as plan; startswith(m, "[xref:")]
	count(violations) == 0
}

test_func_referencing_unknown_storage if {
	plan := {"resource_changes": [
		mk_func("dx-d-itn-platform-func-01", "ghoststorage"),
	]}
	some msg in main.deny with input as plan
	startswith(msg, "[xref:func_storage]")
}

test_storage_without_pep if {
	plan := {"resource_changes": [mk_storage("dxditnplatformst01")]}

	# no PEP at all

	some msg in main.deny with input as plan
	startswith(msg, "[xref:storage_pep]")
}
