import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const useExperimentalSidebarIcons = true;

const categoryClass = (iconName: string): string | undefined =>
  useExperimentalSidebarIcons ? `sidebar-icon-${iconName}` : undefined;

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      className: categoryClass("overview"),
      collapsed: false,
      items: [
        "index",
        "monorepository-setup",
        "tooling-lifecycle",
        "support",
      ],
      label: "Overview",
      type: "category",
    },
    {
      className: categoryClass("github"),
      collapsed: false,
      items: [
        { id: "github/index", label: "Overview", type: "doc" },
        {
          className: categoryClass("git"),
          collapsed: true,
          items: [
            { id: "github/git/index", label: "Overview", type: "doc" },
            "github/git/branch-name",
            "github/git/commit-message",
            "github/git/git-config",
          ],
          label: "Git",
          type: "category",
        },
        {
          className: categoryClass("pull-requests"),
          collapsed: true,
          items: [
            { id: "github/pull-requests/index", label: "Overview", type: "doc" },
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
          type: "category",
        },
        {
          className: categoryClass("workflows"),
          collapsed: true,
          items: [
            { id: "pipelines/index", label: "Overview", type: "doc" },
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
      collapsed: false,
      items: [
        { id: "coding-with-ai/index", label: "Overview", type: "doc" },
        "coding-with-ai/dx-mcp-server",
        "coding-with-ai/plugin-marketplace",
        "coding-with-ai/prompts-catalog",
      ],
      label: "Coding with AI",
      type: "category",
    },
    {
      className: categoryClass("dx-cli"),
      collapsed: false,
      items: [
        "dx-cli/requirements",
        "dx-cli/installation",
        "dx-cli/usage",
      ],
      label: "DX CLI",
      type: "category",
    },
    {
      className: categoryClass("typescript"),
      collapsed: false,
      items: [
        { id: "typescript/index", label: "Overview", type: "doc" },
        "typescript/npm-scripts",
        "typescript/eslint-config",
        "typescript/code-review",
      ],
      label: "TypeScript",
      type: "category",
    },
    {
      className: categoryClass("cloud"),
      collapsed: false,
      items: [
        {
          className: categoryClass("azure"),
          collapsed: true,
          items: [
            { id: "azure/index", label: "Overview", type: "doc" },
            "azure/azure-naming-convention",
            "azure/using-azure-registry-provider",
            {
              collapsed: true,
              items: [
                { id: "azure/iam/index", label: "Overview", type: "doc" },
                "azure/iam/azure-iam",
                "azure/iam/azure-login",
                "azure/iam/custom-roles",
                "azure/iam/iam-cross-subscription",
              ],
              label: "IAM",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                { id: "azure/apim/index", label: "Overview", type: "doc" },
                "azure/apim/api-access-policies",
                "azure/apim/debugging",
              ],
              label: "API Management",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                {
                  id: "azure/app-configuration/index",
                  label: "Overview",
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
              collapsed: true,
              items: [
                {
                  id: "azure/application-deployment/index",
                  label: "Overview",
                  type: "doc",
                },
                "azure/application-deployment/release-azure-appsvc",
                "azure/application-deployment/release-container-app",
                "azure/application-deployment/appservice-hidden-appsettings",
              ],
              label: "Application Deployment",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                { id: "azure/networking/index", label: "Overview", type: "doc" },
                "azure/networking/app-gateway-tls-cert",
                "azure/networking/appservice-plan-dns-resolution",
                "azure/networking/creating-tls-cert",
                "azure/networking/peps-cross-subscription",
              ],
              label: "Networking",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                { id: "azure/monitoring/index", label: "Overview", type: "doc" },
                "azure/monitoring/azure-tracing",
              ],
              label: "Monitoring",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                { id: "azure/policies/index", label: "Overview", type: "doc" },
                "azure/policies/policy-catalog/index",
                "azure/policies/policy-catalog/specific-tags",
              ],
              label: "Policies",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                {
                  id: "azure/static-websites/index",
                  label: "Overview",
                  type: "doc",
                },
                "azure/static-websites/build-deploy-static-assets",
                "azure/static-websites/build-deploy-static-web-app",
                "azure/static-websites/static-assets-deploy",
              ],
              label: "Static Websites",
              type: "category",
            },
            {
              collapsed: true,
              items: [
                {
                  id: "azure/integrating-services/index",
                  label: "Overview",
                  type: "doc",
                },
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
          collapsed: true,
          items: [
            { id: "terraform/index", label: "Overview", type: "doc" },
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
          collapsed: true,
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
      collapsed: true,
      items: [
        { id: "containers/index", label: "Overview", type: "doc" },
        "dev-containers/index",
        "containers/docker-image-build",
      ],
      label: "Containers",
      type: "category",
    },
    {
      className: categoryClass("contributing"),
      collapsed: true,
      items: [
        { id: "contributing/index", label: "Overview", type: "doc" },
        "contributing/contributing-to-dx-provider",
        "contributing/contributing-to-dx-terraform-modules",
        "contributing/documenting-dx-terraform-modules",
      ],
      label: "Contributing",
      type: "category",
    },
    {
      className: categoryClass("deprecated-tools"),
      collapsed: true,
      items: [
        { id: "legacy/index", label: "Overview", type: "doc" },
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
