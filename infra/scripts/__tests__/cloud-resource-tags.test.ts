// Guards DX-owned Terraform configurations without imposing tags on published modules.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import policyRule from "../../policy/_policy_rules/specific_tags_rule_v2.json" with { type: "json" };

const infraDirectory = new URL("../../", import.meta.url);
const stacks = ["bootstrapper", "core", "resources"];
const environments = [
  { directory: "dev", tag: "Dev" },
  { directory: "uat", tag: "Uat" },
  { directory: "prod", tag: "Prod" },
];
const roots = stacks.flatMap((stack) =>
  environments.map((environment) => ({
    environment: environment.tag,
    path: `${stack}/${environment.directory}`,
  })),
);

// These are attachments, child configurations or resource types without a tags argument.
const untaggableResources = new Set([
  "aws_acm_certificate_validation",
  "aws_api_gateway_account",
  "aws_api_gateway_base_path_mapping",
  "aws_api_gateway_deployment",
  "aws_api_gateway_integration",
  "aws_api_gateway_method",
  "aws_api_gateway_method_settings",
  "aws_api_gateway_resource",
  "aws_iam_role_policy_attachment",
  "aws_lambda_permission",
  "aws_s3_bucket_public_access_block",
  "aws_s3_bucket_server_side_encryption_configuration",
  "aws_wafv2_web_acl_association",
  "awscc_bedrock_data_source",
  "azurerm_federated_identity_credential",
  "azurerm_network_security_rule",
  "azurerm_role_assignment",
  "azurerm_static_web_app_custom_domain",
  "azurerm_subnet",
  "azurerm_subnet_network_security_group_association",
  "azurerm_virtual_network_peering",
]);

const terraformFiles = async (directory: URL): Promise<URL[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => {
        const path = new URL(entry.name, directory);
        if (entry.isDirectory()) {
          return terraformFiles(new URL(`${entry.name}/`, directory));
        }
        return entry.name.endsWith(".tf") ? [path] : [];
      }),
  );
  return files.flat();
};

describe("DevEx cloud resource tags", () => {
  it.each(roots)("uses the agreed tag map in $path", async (root) => {
    const content = await readFile(
      new URL(`${root.path}/locals.tf`, infraDirectory),
      "utf8",
    );
    const tagBlock = content.match(/^\s*tags\s*=\s*\{([^}]+)\}/m)?.[1];
    expect(tagBlock, "A root tag map is required").toBeDefined();
    const tags = Object.fromEntries(
      Array.from(
        tagBlock?.matchAll(/(\w+)\s*=\s*"([^"]*)"/g) ?? [],
        (match) => [match[1], match[2]],
      ),
    );

    expect(tags).toMatchObject({
      CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
      Environment: root.environment,
      Owner: "DevEx",
      Source: `https://github.com/pagopa/dx/blob/main/infra/${root.path}`,
    });
  });

  it.each(roots)(
    "sets default tags on every AWS provider in $path",
    async (root) => {
      const content = await readFile(
        new URL(`${root.path}/providers.tf`, infraDirectory),
        "utf8",
      );
      const providers = Array.from(
        content.matchAll(/^provider "aws" \{([\s\S]*?)^\}/gm),
      );
      expect(providers.length).toBeGreaterThan(0);
      for (const provider of providers) {
        expect(provider[1]).toMatch(
          /default_tags\s*\{\s*tags\s*=\s*local\.tags\s*\}/,
        );
      }
    },
  );

  it.each(stacks)(
    "passes root tags to every taggable resource in %s",
    async (stack) => {
      const files = await terraformFiles(new URL(`${stack}/`, infraDirectory));
      for (const file of files) {
        const content = await readFile(file, "utf8");
        const resources = Array.from(
          content.matchAll(
            /^resource "(aws_\w+|awscc_\w+|azurerm_\w+)" "([^"]+)" \{([\s\S]*?)^\}/gm,
          ),
        ).filter(
          (resource) =>
            resource[1] !== undefined && !untaggableResources.has(resource[1]),
        );
        for (const resource of resources) {
          expect(
            resource[3],
            `${fileURLToPath(file)}: ${resource[1]}.${resource[2]}`,
          ).toMatch(/^\s*tags\s*=\s*(local|var)\.tags\s*$/m);
        }
      }
    },
  );
});

describe("DevEx tagging policy", () => {
  it("only validates tags that are present", () => {
    for (const tag of ["CostCenter", "Owner", "Environment", "Source"]) {
      expect(policyRule.if.anyOf).toContainEqual(
        expect.objectContaining({
          allOf: expect.arrayContaining([
            { exists: true, field: `tags['${tag}']` },
          ]),
        }),
      );
    }
    expect(policyRule.then.effect).toBe("deny");
  });

  it("limits CostCenter to the assigned value when present", () => {
    expect(policyRule.if.anyOf).toContainEqual({
      allOf: [
        { exists: true, field: "tags['CostCenter']" },
        {
          field: "tags['CostCenter']",
          notMatch: "TS000 - TECNOLOGIA & SERVIZI",
        },
      ],
    });
  });

  it("limits Environment to the three agreed values when present", () => {
    expect(policyRule.if.anyOf).toContainEqual({
      allOf: [
        { exists: true, field: "tags['Environment']" },
        { field: "tags['Environment']", notMatch: "Dev" },
        { field: "tags['Environment']", notMatch: "Uat" },
        { field: "tags['Environment']", notMatch: "Prod" },
      ],
    });
  });

  it("limits Owner and Source when present", () => {
    expect(policyRule.if.anyOf).toContainEqual({
      allOf: [
        { exists: true, field: "tags['Owner']" },
        { field: "tags['Owner']", notMatch: "DevEx" },
      ],
    });
    expect(policyRule.if.anyOf).toContainEqual({
      allOf: [
        { exists: true, field: "tags['Source']" },
        {
          anyOf: [
            {
              field: "tags['Source']",
              notLike: "https://github.com/pagopa/dx/blob/main/infra/*",
            },
            {
              equals: "https://github.com/pagopa/dx/blob/main/infra/",
              field: "tags['Source']",
            },
          ],
        },
      ],
    });
  });

  it("requires exact tag-name casing only when a tag is present", () => {
    for (const tag of ["CostCenter", "Owner", "Environment", "Source"]) {
      expect(policyRule.if.anyOf).toContainEqual({
        allOf: [
          { exists: true, field: `tags['${tag}']` },
          {
            equals: false,
            value: `[contains(string(field('tags')), '"${tag}":')]`,
          },
        ],
      });
    }
  });
});
