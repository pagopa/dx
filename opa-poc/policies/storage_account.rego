# Storage account compliance — extracted from infra/modules/azure_storage_account/storage_account.tf
# Each rule mirrors a hard-coded value or a `tier_features` constraint inside the module.
package main

import data.lib.naming
import rego.v1

storage_accounts contains r if {
	some r in input.resource_changes
	r.type == "azurerm_storage_account"
	some action in r.change.actions
	action != "delete"
}

function_backing_storage(r) if {
	some f in input.resource_changes
	f.type == "azurerm_linux_function_app"
	some action in f.change.actions
	action != "delete"
	f.change.after.storage_account_name == r.change.after.name
}

function_backing_storage(r) if {
	tags := object.get(r.change.after, "tags", {})
	tags.ModuleName == "azure_function_app"
	not contains(r.address, "durable_function")
}

durable_function_storage(r) if {
	tags := object.get(r.change.after, "tags", {})
	tags.ModuleName == "azure_function_app"
	contains(r.address, "durable_function")
}

storage_resource_type(r) := "durable_function_storage_account" if {
	durable_function_storage(r)
}

storage_resource_type(r) := "function_storage_account" if {
	not durable_function_storage(r)
	function_backing_storage(r)
}

storage_resource_type(r) := "storage_account" if {
	not durable_function_storage(r)
	not function_backing_storage(r)
}

requires_storage_identity(r) if {
	storage_resource_type(r) == "storage_account"
}

# 1. min_tls_version = "TLS1_2"  (storage_account.tf:21)
deny contains msg if {
	some r in storage_accounts
	r.change.after.min_tls_version != "TLS1_2"
	msg := sprintf(
		"[storage:min_tls] %s: 'min_tls_version' must be TLS1_2 (got: %v)",
		[r.address, r.change.after.min_tls_version],
	)
}

# 2. https_traffic_only_enabled = true  (storage_account.tf:22)
deny contains msg if {
	some r in storage_accounts
	r.change.after.https_traffic_only_enabled == false
	msg := sprintf("[storage:https_only] %s: 'https_traffic_only_enabled' must be true", [r.address])
}

# 3. cross_tenant_replication_enabled = false  (storage_account.tf:23)
deny contains msg if {
	some r in storage_accounts
	r.change.after.cross_tenant_replication_enabled == true
	msg := sprintf("[storage:cross_tenant] %s: cross-tenant replication must be disabled", [r.address])
}

# 4. account_kind = "StorageV2"  (storage_account.tf:11)
deny contains msg if {
	some r in storage_accounts
	r.change.after.account_kind != "StorageV2"
	msg := sprintf(
		"[storage:account_kind] %s: 'account_kind' must be 'StorageV2' (got: %v)",
		[r.address, r.change.after.account_kind],
	)
}

# 5. public_network_access_enabled = false  (storage_account.tf:16; module derives this from
#    use_case but the safe default is `false`)
deny contains msg if {
	some r in storage_accounts
	r.change.after.public_network_access_enabled == true
	msg := sprintf(
		"[storage:public_network] %s: public network access must be disabled (use a private endpoint)",
		[r.address],
	)
}

# 6. SystemAssigned identity is mandatory  (storage_account.tf:67)
deny contains msg if {
	some r in storage_accounts
	requires_storage_identity(r)
	identities := object.get(r.change.after, "identity", [])
	count(identities) == 0
	msg := sprintf("[storage:identity] %s: a SystemAssigned identity block is required", [r.address])
}

deny contains msg if {
	some r in storage_accounts
	requires_storage_identity(r)
	identities := object.get(r.change.after, "identity", [])
	count(identities) > 0
	some i in identities
	not contains(i.type, "SystemAssigned")
	msg := sprintf(
		"[storage:identity] %s: identity type must include 'SystemAssigned' (got: %v)",
		[r.address, i.type],
	)
}

# 7. Naming convention: shape check at minimum (a full check requires knowing the
#    {prefix, env, location, domain, instance} that produced the name, which is
#    exactly the gap discussed in FINDINGS.md).
deny contains msg if {
	some r in storage_accounts
	name := r.change.after.name
	resource_type := storage_resource_type(r)
	not naming.shape_ok(resource_type, name)
	msg := sprintf(
		"[storage:naming] %s: name '%s' does not match the storage naming pattern",
		[r.address, name],
	)
}

# 8. ModuleSource tag missing — used by DX tooling to track module adoption.
#    Without the module, consumers MUST set it manually.
deny contains msg if {
	some r in storage_accounts
	tags := object.get(r.change.after, "tags", {})
	not tags.ModuleSource
	msg := sprintf(
		"[storage:tag_module_source] %s: tag 'ModuleSource' is required (replaces module-injected tag)",
		[r.address],
	)
}
