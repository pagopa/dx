package use_case_test

import data.main
import rego.v1

mk_storage(uc, overrides) := {
	"address": sprintf("azurerm_storage_account.%s", [uc]),
	"type": "azurerm_storage_account",
	"change": {"actions": ["create"], "after": object.union(
		{
			"name": sprintf("dxditn%sst01", [uc]),
			"account_kind": "StorageV2",
			"min_tls_version": "TLS1_2",
			"https_traffic_only_enabled": true,
			"cross_tenant_replication_enabled": false,
			"public_network_access_enabled": false,
			"account_replication_type": "ZRS",
			"infrastructure_encryption_enabled": false,
			"default_to_oauth_authentication": false,
			"shared_access_key_enabled": true,
			"identity": [{"type": "SystemAssigned", "identity_ids": null}],
			"tags": {"ModuleSource": "raw", "DXUseCase": uc},
		},
		overrides,
	)},
}

uc_violations(plan) := [m |
	some m in main.deny with input as plan
	startswith(m, "[uc:")
]

test_audit_requires_oauth if {
	plan := {"resource_changes": [mk_storage("audit", {"default_to_oauth_authentication": false})]}
	some msg in uc_violations(plan)
	startswith(msg, "[uc:oauth]")
}

test_audit_requires_infra_encryption if {
	plan := {"resource_changes": [mk_storage("audit", {"infrastructure_encryption_enabled": false, "default_to_oauth_authentication": true})]}
	some msg in uc_violations(plan)
	startswith(msg, "[uc:infra_encryption]")
}

test_development_requires_lrs if {
	plan := {"resource_changes": [mk_storage("development", {"account_replication_type": "ZRS"})]}
	some msg in uc_violations(plan)
	startswith(msg, "[uc:replication]")
}

test_delegated_access_forbids_shared_keys if {
	plan := {"resource_changes": [mk_storage("delegated_access", {"shared_access_key_enabled": true})]}
	some msg in uc_violations(plan)
	startswith(msg, "[uc:shared_key]")
}

test_unknown_use_case_rejected if {
	plan := {"resource_changes": [mk_storage("madeup", {})]}
	some msg in uc_violations(plan)
	startswith(msg, "[uc:unknown]")
}

test_audit_requires_lifecycle_policy if {
	# audit storage with matching settings but no lifecycle policy → 1 deny
	plan := {"resource_changes": [mk_storage("audit", {
		"infrastructure_encryption_enabled": true,
		"default_to_oauth_authentication": true,
	})]}
	some msg in uc_violations(plan)
	startswith(msg, "[uc:audit_lifecycle]")
}

test_audit_with_lifecycle_policy_passes if {
	plan := {"resource_changes": [
		mk_storage("audit", {
			"infrastructure_encryption_enabled": true,
			"default_to_oauth_authentication": true,
		}),
		{
			"address": "azurerm_storage_management_policy.lifecycle",
			"type": "azurerm_storage_management_policy",
			"change": {"actions": ["create"], "after": {"storage_account_id": "/subscriptions/x/.../storageAccounts/dxditnauditst01"}},
		},
	]}

	# No [uc:*] violations for this plan.
	count(uc_violations(plan)) == 0
}

test_development_compliant_yields_no_uc_deny if {
	plan := {"resource_changes": [mk_storage("development", {"account_replication_type": "LRS"})]}
	count(uc_violations(plan)) == 0
}
