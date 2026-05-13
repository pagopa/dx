# Cross-resource invariants — things the module enforces by *constructing*
# multiple resources together, that we can only validate (not generate) with OPA.
package main

import rego.v1

# Helper: all storage accounts in the plan, keyed by their planned name.
storage_by_name[name] := r if {
	some r in input.resource_changes
	r.type == "azurerm_storage_account"
	some action in r.change.actions
	action != "delete"
	name := r.change.after.name
}

# Helper: all linux function apps in the plan that are being created/updated.
func_apps contains r if {
	some r in input.resource_changes
	r.type == "azurerm_linux_function_app"
	some action in r.change.actions
	action != "delete"
}

config_resources contains cfg if {
	some r in object.get(object.get(input, "configuration", {}), "root_module", {}).resources
	cfg := {
		"address": r.address,
		"local_address": r.address,
		"module_prefix": "",
		"type": r.type,
		"expressions": object.get(r, "expressions", {}),
	}
}

config_resources contains cfg if {
	some call_name, call in object.get(object.get(object.get(input, "configuration", {}), "root_module", {}), "module_calls", {})
	some r in object.get(call.module, "resources", [])
	prefix := sprintf("module.%s.", [call_name])
	cfg := {
		"address": sprintf("%s%s", [prefix, r.address]),
		"local_address": r.address,
		"module_prefix": prefix,
		"type": r.type,
		"expressions": object.get(r, "expressions", {}),
	}
}

reference_matches(cfg, refs, address) if {
	some ref in refs
	prefix := object.get(cfg, "module_prefix", "")
	prefix == ""
	ref == address
}

reference_matches(cfg, refs, address) if {
	some ref in refs
	prefix := object.get(cfg, "module_prefix", "")
	prefix == ""
	ref == sprintf("%s.id", [address])
}

reference_matches(cfg, refs, address) if {
	some ref in refs
	prefix := object.get(cfg, "module_prefix", "")
	prefix != ""
	full_ref := sprintf("%s%s", [prefix, ref])
	full_ref == address
}

reference_matches(cfg, refs, address) if {
	some ref in refs
	prefix := object.get(cfg, "module_prefix", "")
	prefix != ""
	full_ref := sprintf("%s%s", [prefix, ref])
	full_ref == sprintf("%s.id", [address])
}

# Helper: all private endpoints in the plan, keyed by the *target* resource id
# they connect to. The target id is the `private_connection_resource_id`
# inside `private_service_connection`.
pep_targets contains target if {
	some r in input.resource_changes
	r.type == "azurerm_private_endpoint"
	some action in r.change.actions
	action != "delete"
	some psc in r.change.after.private_service_connection
	target := psc.private_connection_resource_id
}

pep_references_storage(sa) if {
	some cfg in config_resources
	cfg.type == "azurerm_private_endpoint"
	some psc in object.get(cfg.expressions, "private_service_connection", [])
	refs := object.get(object.get(psc, "private_connection_resource_id", {}), "references", [])
	reference_matches(cfg, refs, sa.address)
}

pep_references_storage(sa) if {
	some t in pep_targets
	contains(t, sa.change.after.name)
}

# 1. Every function app must reference a storage account that is also defined
#    in the SAME plan and that is itself compliant. Without the module, nothing
#    forces this.
deny contains msg if {
	some f in func_apps
	storage_name := f.change.after.storage_account_name
	not storage_by_name[storage_name]
	msg := sprintf(
		"[xref:func_storage] %s: references storage_account '%s' that is not defined in this plan",
		[f.address, storage_name],
	)
}

# 2. Every storage account must have a private endpoint declared in the SAME
#    plan (any address). The module creates 4 PEPs automatically (blob/file/
#    queue/table); here we just demand at least one. We can't enforce *which*
#    sub-services are PEP'd because that requires per-storage configuration
#    knowledge the policy doesn't have.
deny contains msg if {
	some name, sa in storage_by_name
	sa.change.after.public_network_access_enabled == false
	not pep_references_storage(sa)
	msg := sprintf(
		"[xref:storage_pep] %s: storage_account '%s' has public access disabled but no private endpoint references it in this plan",
		[sa.address, name],
	)
}
