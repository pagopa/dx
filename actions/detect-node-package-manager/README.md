# Detect Node.js Package Manager Action

This GitHub Action detects the Node.js package manager used in a repository by checking the `packageManager` field in `package.json` and falling back to lock file detection.

## Usage

```yaml
- name: Detect package manager
  id: detect-pm
  uses: pagopa/dx/actions/detect-node-package-manager@main

- name: Use detected package manager
  run: |
    echo "Package manager: ${{ steps.detect-pm.outputs.package-manager }}"
```

## Outputs

| Output            | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `package-manager` | The detected package manager (`npm`, `yarn`, or `pnpm`) |

## Detection Logic

The action uses the following detection order:

1. **Package.json Detection**: Checks for the `packageManager` field in `package.json`
   - Example: `"packageManager": "yarn@3.2.0"` → detects `yarn`
   - This is the preferred method as it's the standard way to specify package managers

2. **Lock File Detection**: Falls back to checking for lock files:
   - `yarn.lock` → `yarn`
   - `pnpm-lock.yaml` → `pnpm`
   - `package-lock.json` → `npm`

3. **Default**: If no package manager is detected, defaults to `npm`

## Examples

### Basic Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Detect package manager
    id: detect-pm
    uses: pagopa/dx/actions/detect-node-package-manager@main

  - name: Install dependencies
    run: |
      if [ "${{ steps.detect-pm.outputs.package-manager }}" = "yarn" ]; then
        yarn install
      elif [ "${{ steps.detect-pm.outputs.package-manager }}" = "pnpm" ]; then
        pnpm install
      else
        npm install
      fi
```

### With Package Manager Setup

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Detect package manager
    id: detect-pm
    uses: pagopa/dx/actions/detect-node-package-manager@main

  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: "20"
      cache: ${{ steps.detect-pm.outputs.package-manager }}

  - name: Install dependencies
    run: |
      case "${{ steps.detect-pm.outputs.package-manager }}" in
        yarn) yarn install ;;
        pnpm) pnpm install ;;
        *) npm install ;;
      esac
```

## Requirements

- The action requires `jq` to be available for JSON parsing (available by default in GitHub Actions runners)
- Works with any repository structure that follows standard Node.js package manager conventions
