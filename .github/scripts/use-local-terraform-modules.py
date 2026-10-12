"""Resolve AzureRM module dependencies from a disposable test checkout, not releases."""

import argparse
import json
import os
from pathlib import Path
import re


def use_local_modules(modules_directory):
    workspace = modules_directory.parent.parent
    roots = [
        root for root in sorted(modules_directory.iterdir())
        if root.is_dir() and (root / "module.json").is_file()
        and any("hashicorp/azurerm" in file.read_text() for file in root.glob("*.tf"))
    ]
    if not roots:
        raise ValueError(f"No AzureRM module roots found in {modules_directory}")
    sources = {}
    for root in roots:
        metadata = json.loads((root / "module.json").read_text())
        sources[f"pagopa-dx/{root.name.replace('_', '-')}/{metadata['provider']}"] = root

    updates = {}
    for root in roots:
        for file in sorted(root.rglob("*.tf")):
            if ".terraform" in file.parts:
                continue
            original = text = file.read_text()
            for source, target in sources.items():
                pattern = (
                    r'(?m)^(?P<indent>[ \t]*)source\s*=\s*"' + re.escape(source)
                    + r'"\s+version\s*=\s*"[^"]+"'
                )
                relative_path = os.path.relpath(target, file.parent)
                if not relative_path.startswith("."):
                    relative_path = "./" + relative_path
                text = re.sub(
                    pattern,
                    lambda match: f'{match["indent"]}source = "{relative_path}"',
                    text,
                )
                if re.search(r'source\s*=\s*"' + re.escape(source) + r'"', text):
                    raise ValueError(f"Unsupported source/version layout in {file}: {source}")
            if text != original:
                updates[file] = text

    for file, text in updates.items():
        file.write_text(text)
        print(f"Using checkout-local module dependencies: {file}")
    return len(updates)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("modules_directory", type=Path, help="infra/modules in a disposable checkout")
    arguments = parser.parse_args()
    use_local_modules(arguments.modules_directory.resolve())
