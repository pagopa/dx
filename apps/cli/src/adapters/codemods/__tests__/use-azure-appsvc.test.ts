import { describe, expect, it } from "vitest";

import { migrateWorkflow } from "../use-azure-appsvc.js";

describe("migrateWorkflow", () => {
  const sha = "testsha";
  const migrate = migrateWorkflow(sha);

  it("adds disable_auto_staging_deploy under with for web_app_deploy", () => {
    const input = `
jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/web_app_deploy.yaml@main
    with:
      web_app_name: my-app
      use_staging_slot: true
`;
    const output = migrate(input, "workflow.yaml");
    expect(output).toContain("disable_auto_staging_deploy: true");
  });

  it("adds disable_auto_staging_deploy under with for function_app_deploy", () => {
    const input = `
jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/function_app_deploy.yaml@main
    with:
      function_app_name: my-func
      use_staging_slot: true
`;
    const output = migrate(input, "workflow.yaml");
    expect(output).toContain("disable_auto_staging_deploy: true");
  });

  it("renames function_app_name to web_app_name", () => {
    const input = `
jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/function_app_deploy.yaml@main
    with:
      function_app_name: my-func
`;
    const output = migrate(input, "workflow.yaml");
    expect(output).toContain("web_app_name: my-func");
    expect(output).not.toContain("function_app_name:");
  });

  it("removes use_staging_slot", () => {
    const input = `
jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/web_app_deploy.yaml@main
    with:
      web_app_name: my-app
      use_staging_slot: true
`;
    const output = migrate(input, "workflow.yaml");
    expect(output).not.toContain("use_staging_slot:");
  });

  it("updates uses to release-azure-appsvc.yaml@sha", () => {
    const input = `
jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/web_app_deploy.yaml@main
    with:
      web_app_name: my-app
`;
    const output = migrate(input, "workflow.yaml");
    expect(output).toContain(
      `uses: pagopa/dx/.github/workflows/release-azure-appsvc-v1.yaml@${sha}`,
    );
  });

  it("does not change unrelated workflows", () => {
    const input = `
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
`;
    const output = migrate(input, "workflow.yaml");
    expect(output).toBe(input);
  });
});
