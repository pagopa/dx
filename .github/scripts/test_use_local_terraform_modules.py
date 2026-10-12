"""Contract tests for the test-only Terraform module source resolver."""

import json
from pathlib import Path
import runpy
import tempfile
import unittest

use_local_modules = runpy.run_path(
    str(Path(__file__).with_name("use-local-terraform-modules.py"))
)["use_local_modules"]


class LocalModuleTests(unittest.TestCase):
    def test_scoped_transitive_sources_and_idempotence(self):
        with tempfile.TemporaryDirectory() as temporary:
            modules = Path(temporary)
            for name, azure in (("azure_parent", True), ("azure_child", True), ("aws_other", False)):
                root = modules / name
                root.mkdir()
                (root / "module.json").write_text(json.dumps({"provider": "azurerm" if azure else "aws"}))
                (root / "providers.tf").write_text("hashicorp/azurerm" if azure else "hashicorp/aws")
            parent = modules / "azure_parent"
            nested = parent / "modules/nested"
            nested.mkdir(parents=True)
            dependency = 'module "child" {\n  source = "pagopa-dx/azure-child/azurerm"\n  version = "~> 42.0"\n}\n'
            (nested / "main.tf").write_text(dependency)
            (modules / "aws_other/main.tf").write_text(dependency)
            cache = parent / ".terraform/modules/cached"
            cache.mkdir(parents=True)
            (cache / "main.tf").write_text(dependency)
            (parent / "external.tf").write_text('module "external" {\n  source = "another/module/azurerm"\n  version = "1.0.0"\n}\n')
            self.assertEqual(use_local_modules(modules), 1)
            self.assertEqual((nested / "main.tf").read_text(), 'module "child" {\n  source = "../../../azure_child"\n}\n')
            self.assertEqual((modules / "aws_other/main.tf").read_text(), dependency)
            self.assertEqual((cache / "main.tf").read_text(), dependency)
            self.assertIn('version = "1.0.0"', (parent / "external.tf").read_text())
            self.assertEqual(use_local_modules(modules), 0)

    def test_missing_version_fails_before_writing(self):
        with tempfile.TemporaryDirectory() as temporary:
            modules = Path(temporary)
            root = modules / "azure_example"
            root.mkdir()
            (root / "module.json").write_text('{"provider":"azurerm"}')
            (root / "providers.tf").write_text("hashicorp/azurerm")
            source = 'module "invalid" {\n  source = "pagopa-dx/azure-example/azurerm"\n}\n'
            (root / "main.tf").write_text(source)
            with self.assertRaisesRegex(ValueError, "Unsupported source/version layout"):
                use_local_modules(modules)
            self.assertEqual((root / "main.tf").read_text(), source)


if __name__ == "__main__":
    unittest.main()
