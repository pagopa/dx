package lib.naming_test

import data.lib.naming
import rego.v1

cfg_func := {
	"prefix": "dx",
	"environment": "d",
	"location": "itn",
	"domain": "platform",
	"resource_type": "function_app",
	"instance_number": "1",
}

cfg_storage := {
	"prefix": "dx",
	"environment": "d",
	"location": "itn",
	"domain": "platform",
	"resource_type": "storage_account",
	"instance_number": "1",
}

cfg_function_storage := {
	"prefix": "dx",
	"environment": "d",
	"location": "itn",
	"domain": "platform",
	"name": "poc",
	"resource_type": "function_storage_account",
	"instance_number": "1",
}

cfg_subnet := {
	"prefix": "dx",
	"environment": "p",
	"location": "weu",
	"resource_type": "subnet",
	"instance_number": "5",
}

test_function_app_name if {
	naming.expected_name(cfg_func) == "dx-d-itn-platform-func-01"
}

test_storage_account_name_has_no_hyphens if {
	naming.expected_name(cfg_storage) == "dxditnplatformst01"
}

test_function_storage_account_name_has_no_hyphens if {
	naming.expected_name(cfg_function_storage) == "dxditnplatformpocstfn01"
}

test_subnet_without_domain if {
	naming.expected_name(cfg_subnet) == "dx-p-weu-snet-05"
}

test_invalid_environment_yields_no_name if {
	bad := object.union(cfg_func, {"environment": "x"})
	not naming.expected_name(bad)
}

test_invalid_location_yields_no_name if {
	bad := object.union(cfg_func, {"location": "useast"})
	not naming.expected_name(bad)
}

test_unknown_resource_type_yields_no_name if {
	bad := object.union(cfg_func, {"resource_type": "totally_made_up"})
	not naming.expected_name(bad)
}

test_valid_name_matches if {
	naming.valid_name(cfg_func, "dx-d-itn-platform-func-01")
}

test_valid_name_rejects_wrong_instance if {
	not naming.valid_name(cfg_func, "dx-d-itn-platform-func-02")
}

test_shape_ok_dashed if {
	naming.shape_ok("function_app", "dx-d-itn-platform-func-01")
}

test_shape_ok_storage if {
	naming.shape_ok("storage_account", "dxditnplatformst01")
}

test_shape_ok_function_storage if {
	naming.shape_ok("function_storage_account", "dxditnplatformpocstfn01")
}

test_shape_rejects_missing_instance if {
	not naming.shape_ok("function_app", "dx-d-itn-platform-func")
}

test_shape_rejects_unknown_env if {
	not naming.shape_ok("function_app", "dx-x-itn-platform-func-01")
}
