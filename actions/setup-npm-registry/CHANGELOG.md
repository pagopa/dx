## 0.0.1 (2026-10-21)

### 🩹 Fixes

- New `setup-npm-registry` GitHub Action that authenticates npm and pnpm to the GitHub Packages registry that hosts DX packages. The token is passed as a `token` input, written expanded to a private npmrc under `runner.temp`, and `NPM_CONFIG_USERCONFIG` is exported for the rest of the job, so consumers configure a single variable and no step has to resolve a `${VAR}` placeholder. `validate-v2.yaml` now uses the action instead of repeating the npmrc bootstrap in every job. ([#2347](https://github.com/pagopa/dx/pull/2347))
- Replace the `${NODE_AUTH_TOKEN}` placeholder with the token itself, expanded once when the action writes the npmrc. A placeholder is re-evaluated by every npm and pnpm invocation that loads the file, so each step that could not see the variable printed `Failed to replace env in config: ${NODE_AUTH_TOKEN}`. ([#2383](https://github.com/pagopa/dx/pull/2383))

  The action now receives the credential through a required `token` input, writes it to a `0600` npmrc under `runner.temp` instead of `$HOME/.npmrc`, and exports `NPM_CONFIG_USERCONFIG` for the rest of the job. Consumers configure a single variable:
  ```yaml
  - name: Setup npm registry
    uses: pagopa/dx/actions/setup-npm-registry@main
    with:
      token: ${{ secrets.GITHUB_TOKEN }}

  - name: Install dependencies
    run: pnpm --filter . ci
  ```

### ❤️ Thank You

- Danilo Spinelli @gunzip