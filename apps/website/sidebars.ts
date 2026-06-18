import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// Manual docs sidebar configuration for the DX website information architecture.
const useExperimentalSidebarIcons = true;

const categoryClass = (iconName: string): string | undefined =>
  useExperimentalSidebarIcons ? `sidebar-icon-${iconName}` : undefined;

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      className: categoryClass("overview"),
      items: ["index", "monorepository-setup", "tooling-lifecycle", "support"],
      label: "Overview",
      type: "category",
    },
    {
      className: categoryClass("github"),
      items: [
        {
          id: "github/index",
          label: "Collaborating on GitHub",
          type: "doc",
        },
        {
          className: categoryClass("git"),
          items: [
            "github/git/branch-name",
            "github/git/commit-message",
            "github/git/git-config",
          ],
          label: "Git",
          type: "category",
        },
        {
          className: categoryClass("pull-requests"),
          items: [
            {
              id: "github/pull-requests/index",
              label: "General Principles",
              type: "doc",
            },
            "github/pull-requests/format",
            "github/pull-requests/acceptance-criteria",
            "github/pull-requests/auto-merge",
            "github/pull-requests/changeset",
            "github/pull-requests/version-plan",
            {
              items: [
                {
                  id: "github/pull-requests/code-review/index",
                  label: "Responsibilities",
                  type: "doc",
                },
                {
                  id: "github/pull-requests/code-review/conventional-comments",
                  label: "Conventional Commits",
                  type: "doc",
                },
              ],
              label: "Code Reviews",
              type: "category",
            },
          ],
          label: "Pull Requests",
          type: "category",
        },
        {
          className: categoryClass("workflows"),
          items: [
            { id: "pipelines/index", label: "DX Workflows", type: "doc" },
            "pipelines/triggers",
            "pipelines/release",
            "pipelines/nx-release",
            "pipelines/keep-alive",
            "pipelines/opex-dashboard",
          ],
          label: "Workflows",
          type: "category",
        },
      ],
      label: "GitHub",
      type: "category",
    },
    {
      className: categoryClass("coding-with-ai"),
      items: [
        { id: "coding-with-ai/index", label: "AI in DX", type: "doc" },
        "coding-with-ai/dx-mcp-server",
        "coding-with-ai/plugin-marketplace",
      ],
      label: "Coding with AI",
      type: "category",
    },
    {
      className: categoryClass("dx-cli"),
      items: [
        { id: "dx-cli/requirements", label: "Installation", type: "doc" },
        "dx-cli/usage",
      ],
      label: "DX CLI",
      type: "category",
    },
    {
      className: categoryClass("typescript"),
      items: [
        { id: "typescript/index", label: "Typescript in DX", type: "doc" },
        "typescript/npm-scripts",
        "typescript/eslint-config",
        "typescript/code-review",
      ],
      label: "TypeScript",
      type: "category",
    },
    {
      className: categoryClass("cloud"),
      items: [
        {
          className: categoryClass("azure"),
          items: [
            "azure/azure-naming-convention",
            "azure/using-azure-registry-provider",
            {
              items: [
                "azure/iam/azure-iam",
                "azure/iam/azure-login",
                "azure/iam/custom-roles",
                "azure/iam/iam-cross-subscription",
              ],
              label: "IAM",
              type: "category",
            },
            {
              items: ["azure/apim/api-access-policies", "azure/apim/debugging"],
              label: "API Management",
              type: "category",
            },
            {
              items: [
                {
                  id: "azure/app-configuration/index",
                  label: "Managing AppSettings and Secrets With Azure",
                  type: "doc",
                },
                "azure/app-configuration/azure-app-configuration",
                "azure/app-configuration/appsettings-definition",
                "azure/app-configuration/appsettings-deploy",
              ],
              label: "App Configuration",
              type: "category",
            },
            {
              items: [
                "azure/application-deployment/release-azure-appsvc",
                "azure/application-deployment/release-container-app",
                "azure/application-deployment/appservice-hidden-appsettings",
              ],
              label: "Application Deployment",
              type: "category",
            },
            {
              items: [
                "azure/networking/app-gateway-tls-cert",
                "azure/networking/appservice-plan-dns-resolution",
                "azure/networking/creating-tls-cert",
                "azure/networking/peps-cross-subscription",
              ],
              label: "Networking",
              type: "category",
            },
            {
              items: ["azure/monitoring/azure-tracing"],
              label: "Monitoring",
              type: "category",
            },
            {
              items: [
                {
                  id: "azure/policies/index",
                  label: "Azure Policies",
                  type: "doc",
                },
                "azure/policies/policy-catalog/index",
                "azure/policies/policy-catalog/specific-tags",
              ],
              label: "Policies",
              type: "category",
            },
            {
              items: [
                "azure/static-websites/build-deploy-static-assets",
                "azure/static-websites/build-deploy-static-web-app",
                "azure/static-websites/static-assets-deploy",
              ],
              label: "Static Websites",
              type: "category",
            },
            {
              items: [
                "azure/integrating-services/apim-function-app-authentication",
                "azure/integrating-services/eventgrid-storage-functions",
                "azure/integrating-services/using-service-bus",
              ],
              label: "Integrating Services",
              type: "category",
            },
            "azure/archive-data",
          ],
          label: "Azure",
          type: "category",
        },
        {
          className: categoryClass("terraform"),
          items: [
            { id: "terraform/index", label: "IaC in DX", type: "doc" },
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
          type: "category",
        },
        {
          className: categoryClass("multi-csp"),
          items: ["multi-csp/index"],
          label: "Multi-CSP",
          type: "category",
        },
      ],
      label: "Cloud",
      type: "category",
    },
    {
      className: categoryClass("containers"),
      items: [
        { id: "containers/index", label: "Why Containers", type: "doc" },
        "dev-containers/index",
        "containers/docker-image-build",
      ],
      label: "Containers",
      type: "category",
    },
    {
      className: categoryClass("contributing"),
      items: [
        "contributing/contributing-to-dx-provider",
        "contributing/contributing-to-dx-terraform-modules",
        "contributing/documenting-dx-terraform-modules",
      ],
      label: "Contributing",
      type: "category",
    },
    {
      className: categoryClass("deprecated-tools"),
      items: [
        { id: "legacy/index", label: "Migrations", type: "doc" },
        "legacy/legacy-code-review",
        "legacy/legacy-deploy-pipelines-azure",
        "legacy/legacy-publish-sdk",
      ],
      label: "Deprecated Tools",
      type: "category",
    },
  ],
};

export default sidebars;
