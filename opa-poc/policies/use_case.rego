# use-case-aware storage account rules.
#
# Mirrors the `local.use_cases` matrix in
# infra/modules/azure_storage_account/locals.tf. The matrix maps a `use_case`
# string ("default" | "development" | "audit" | "delegated_access" | "archive")
# to a tuple of (replication_type, infra_encryption, default_to_oauth, …).
#
# The use_case itself is not in `terraform show -json`, so it must be carried
# through a well-known **tag** (`DXUseCase`). This is the GenAI hand-off: the
# AI is told to set the tag, the policy enforces the matching defaults.
package main

import rego.v1

use_case_matrix := {
	"development": {
		"replication_type": "LRS",
		"infrastructure_encryption_enabled": false,
		"default_to_oauth_authentication": false,
		"shared_access_key_enabled": true,
	},
	"default": {
		"replication_type": "ZRS",
		"infrastructure_encryption_enabled": false,
		"default_to_oauth_authentication": false,
		"shared_access_key_enabled": true,
	},
	"audit": {
		"replication_type": "ZRS",
		"infrastructure_encryption_enabled": true,
		"default_to_oauth_authentication": true,
		"shared_access_key_enabled": true,
	},
	"delegated_access": {
		"replication_type": "ZRS",
		"infrastructure_encryption_enabled": false,
		"default_to_oauth_authentication": false,
		"shared_access_key_enabled": false,
	},
	"archive": {
		"replication_type": "LRS",
		"infrastructure_encryption_enabled": false,
		"default_to_oauth_authentication": false,
		"shared_access_key_enabled": true,
	},
}

uc_storage_accounts contains r if {
	some r in input.resource_changes
	r.type == "azurerm_storage_account"
	some action in r.change.actions
	action != "delete"

	# Only kick in when DXUseCase is set; otherwise the generic rules in
	# storage_account.rego apply.
	object.get(r.change.after.tags, "DXUseCase", "") != ""
}

# 1. The tag value must be one of the recognised use cases.
deny contains msg if {
	some r in uc_storage_accounts
	uc := r.change.after.tags.DXUseCase
	not use_case_matrix[uc]
	msg := sprintf(
		"[uc:unknown] %s: DXUseCase '%s' is not one of %v",
		[r.address, uc, [k | some k, _ in use_case_matrix]],
	)
}

# 2. account_replication_type must match the matrix for the declared use case.
deny contains msg if {
	some r in uc_storage_accounts
	uc := r.change.after.tags.DXUseCase
	spec := use_case_matrix[uc]
	got := r.change.after.account_replication_type
	got != spec.replication_type
	msg := sprintf(
		"[uc:replication] %s: use_case '%s' requires account_replication_type='%s' (got: %s)",
		[r.address, uc, spec.replication_type, got],
	)
}

# 3. infrastructure_encryption_enabled must match.
deny contains msg if {
	some r in uc_storage_accounts
	uc := r.change.after.tags.DXUseCase
	spec := use_case_matrix[uc]
	got := object.get(r.change.after, "infrastructure_encryption_enabled", false)
	got != spec.infrastructure_encryption_enabled
	msg := sprintf(
		"[uc:infra_encryption] %s: use_case '%s' requires infrastructure_encryption_enabled=%v (got: %v)",
		[r.address, uc, spec.infrastructure_encryption_enabled, got],
	)
}

# 4. default_to_oauth_authentication must match.
deny contains msg if {
	some r in uc_storage_accounts
	uc := r.change.after.tags.DXUseCase
	spec := use_case_matrix[uc]
	got := object.get(r.change.after, "default_to_oauth_authentication", false)
	got != spec.default_to_oauth_authentication
	msg := sprintf(
		"[uc:oauth] %s: use_case '%s' requires default_to_oauth_authentication=%v (got: %v)",
		[r.address, uc, spec.default_to_oauth_authentication, got],
	)
}

# 5. shared_access_key_enabled must match.
deny contains msg if {
	some r in uc_storage_accounts
	uc := r.change.after.tags.DXUseCase
	spec := use_case_matrix[uc]
	got := object.get(r.change.after, "shared_access_key_enabled", true)
	got != spec.shared_access_key_enabled
	msg := sprintf(
		"[uc:shared_key] %s: use_case '%s' requires shared_access_key_enabled=%v (got: %v)",
		[r.address, uc, spec.shared_access_key_enabled, got],
	)
}

# 6. Cross-resource conditional: when use_case='audit', the storage account
#    must have a lifecycle management policy in the same plan. This mirrors
#    `azurerm_storage_management_policy.lifecycle_audit` (count = use_case == "audit")
#    in storage_account.tf:94.
audit_lifecycle_targets contains target if {
	some r in input.resource_changes
	r.type == "azurerm_storage_management_policy"
	some action in r.change.actions
	action != "delete"
	target := r.change.after.storage_account_id
}

deny contains msg if {
	some r in uc_storage_accounts
	r.change.after.tags.DXUseCase == "audit"
	name := r.change.after.name
	count([t |
		some t in audit_lifecycle_targets
		contains(t, name)
	]) == 0
	msg := sprintf(
		"[uc:audit_lifecycle] %s: use_case='audit' requires an azurerm_storage_management_policy in the same plan",
		[r.address],
	)
}
