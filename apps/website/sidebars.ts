import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    // ─── Overview (open) ───
    {
      collapsed: false,
      items: [
        "index",
        "monorepository-setup",
        "tooling-lifecycle",
        "support",
      ],
      label: "Overview",
      link: undefined,
      type: "category",
    },

    // ─── GitHub (open, sub-categories closed) ───
    {
      collapsed: false,
      items: [
        {
          collapsed: true,
          items: [
            "github/git/branch-name",
            "github/git/commit-message",
            "github/git/git-config",
          ],
          label: "Git",
          link: { id: "github/git/index", type: "doc" },
          type: "category",
        },
        {
          collapsed: true,
          items: [
            "github/pull-requests/format",
            "github/pull-requests/acceptance-criteria",
            "github/pull-requests/auto-merge",
            "github/pull-requests/changeset",
            "github/pull-requests/version-plan",
            {
              id: "github/pull-requests/code-review/index",
              label: "Code Review",
              type: "doc",
            },
          ],
          label: "Pull Requests",
          link: { id: "github/pull-requests/index", type: "doc" },
          type: "category",
        },
        {
          collapsed: true,
          items: [
            "pipelines/triggers",
            "pipelines/release",
            "pipelines/nx-release",
            "pipelines/keep-alive",
            "pipelines/opex-dashboard",
          ],
          label: "Workflows",
          link: { id: "pipelines/index", type: "doc" },
          type: "category",
        },
      ],
      label: "GitHub",
      link: { id: "github/index", type: "doc" },
      type: "category",
    },

    // ─── Coding with AI (open) ───
    {
      collapsed: false,
      items: [
        "coding-with-ai/dx-mcp-server",
        "coding-with-ai/plugin-marketplace",
        "coding-with-ai/prompts-catalog",
      ],
      label: "Coding with AI",
      link: { id: "coding-with-ai/index", type: "doc" },
      type: "category",
    },

    // ─── DX CLI (open) ───
    {
      collapsed: false,
      items: [
        "dx-cli/requirements",
        "dx-cli/installation",
        "dx-cli/usage",
      ],
      label: "DX CLI",
      link: undefined,
      type: "category",
    },

    // ─── TypeScript (open) ───
    {
      collapsed: false,
      items: [
        "typescript/npm-scripts",
        "typescript/eslint-config",
        "typescript/code-review",
      ],
      label: "TypeScript",
      link: { id: "typescript/index", type: "doc" },
      type: "category",
    },

    // ─── Cloud (open) ───
    {
      collapsed: false,
      items: [
        // Azure (closed)
        {
          collapsed: true,
          items: [
            "azure/azure-naming-convention",
            "azure/using-azure-registry-provider",
            {
              collapsed: true,
              items: [
                "azure/iam/azure-iam",
                "azure/iam/azure-login",
                "azure/iam/custom-roles",
                "azure/iam/iam-cross-subscription",
              ],
              label: "IAM",
              link: { id: "azure/iam/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/apim/api-access-policies",
                "azure/apim/debugging",
              ],
              label: "API Management",
              link: { id: "azure/apim/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/app-configuration/azure-app-configuration",
                "azure/app-configuration/appsettings-definition",
                "azure/app-configuration/appsettings-deploy",
              ],
              label: "App Configuration",
              link: { id: "azure/app-configuration/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/application-deployment/release-azure-appsvc",
                "azure/application-deployment/release-container-app",
                "azure/application-deployment/appservice-hidden-appsettings",
              ],
              label: "Application Deployment",
              link: { id: "azure/application-deployment/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/networking/app-gateway-tls-cert",
                "azure/networking/appservice-plan-dns-resolution",
                "azure/networking/creating-tls-cert",
                "azure/networking/peps-cross-subscription",
              ],
              label: "Networking",
              link: { id: "azure/networking/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: ["azure/monitoring/azure-tracing"],
              label: "Monitoring",
              link: { id: "azure/monitoring/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/policies/policy-catalog/index",
                "azure/policies/policy-catalog/specific-tags",
              ],
              label: "Policies",
              link: { id: "azure/policies/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/static-websites/build-deploy-static-assets",
                "azure/static-websites/build-deploy-static-web-app",
                "azure/static-websites/static-assets-deploy",
              ],
              label: "Static Websites",
              link: { id: "azure/static-websites/index", type: "doc" },
              type: "category",
            },
            {
              collapsed: true,
              items: [
                "azure/integrating-services/apim-function-app-authentication",
                "azure/integrating-services/eventgrid-storage-functions",
                "azure/integrating-services/using-service-bus",
              ],
              label: "Integrating Services",
              link: { id: "azure/integrating-services/index", type: "doc" },
              type: "category",
            },
            "azure/archive-data",
          ],
          label: "Azure",
          link: { id: "azure/index", type: "doc" },
          type: "category",
        },
        // Terraform (closed)
        {
          collapsed: true,
          items: [
            "terraform/infra-folder-structure",
            "terraform/code-style",
            "terraform/pre-commit-terraform",
            "terraform/infra-plan",
            "terraform/infra-apply",
            "terraform/drift-detection",
            "terraform/static-analysis",
            "terraform/required-tags",
            "terraform/using-terraform-registry-modules",
          ],
          label: "Terraform",
          link: { id: "terraform/index", type: "doc" },
          type: "category",
        },
        // Multi-CSP (closed)
        {
          collapsed: true,
          items: ["multi-csp/index"],
          label: "Multi-CSP",
          link: undefined,
          type: "category",
        },
      ],
      label: "Cloud",
      link: undefined,
      type: "category",
    },

    // ─── Containers (closed) ───
    {
      collapsed: true,
      items: [
        "dev-containers/index",
        "containers/docker-image-build",
      ],
      label: "Containers",
      link: { id: "containers/index", type: "doc" },
      type: "category",
    },

    // ─── Contributing (closed) ───
    {
      collapsed: true,
      items: [
        "contributing/contributing-to-dx-provider",
        "contributing/contributing-to-dx-terraform-modules",
        "contributing/documenting-dx-terraform-modules",
      ],
      label: "Contributing",
      link: { id: "contributing/index", type: "doc" },
      type: "category",
    },

    // ─── Deprecated Tools (closed) ───
    {
      collapsed: true,
      items: [
        "legacy/legacy-code-review",
        "legacy/legacy-deploy-pipelines-azure",
        "legacy/legacy-publish-sdk",
      ],
      label: "Deprecated Tools",
      link: { id: "legacy/index", type: "doc" },
      type: "category",
    },
  ],
};

export default sidebars;
