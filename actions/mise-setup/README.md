# Mise Setup GitHub Action

This action configures repository tools with the version of
[mise](https://mise.jdx.dev/) already available on the runner.

If mise is not installed, the action skips tool setup successfully. Detection
does not depend on a specific mise configuration file, so repositories can use
any configuration source supported by mise.

## Usage

```yaml
- name: Setup repository tools
  id: mise
  uses: pagopa/dx/actions/mise-setup@main
```

## Outputs

| Output    | Description                                          |
| --------- | ---------------------------------------------------- |
| `enabled` | Whether mise was available and tool setup was run    |
| `version` | The version of the pre-installed mise binary, if any |

## Requirements

The runner must provide mise on `PATH`. The action does not install mise when
it is missing.
