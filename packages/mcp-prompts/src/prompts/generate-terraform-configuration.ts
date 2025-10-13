import type { CatalogEntry } from "../types.js";

export const generateTerraformConfiguration: CatalogEntry = {
  category: "terraform",
  enabled: true,
  id: "generate-terraform-configuration",
  metadata: {
    description:
      "Generates a Terraform configuration following PagoPA DX best practices. Guides users through querying the knowledge base for folder structure, modules, and conventions.",
    examples: [
      "Generate a Terraform configuration for an Azure Function App",
      "Create infrastructure for a new microservice with API Management",
    ],
    title: "Generate Terraform Configuration",
  },
  prompt: {
    arguments: [
      {
        description:
          "Requirements for the Terraform configuration to generate.",
        name: "requirements",
        required: false,
      },
    ],
    description:
      "Generates a Terraform configuration following PagoPA DX best practices.",
    load: async (args: { requirements?: string }) => ({
      content: [
        {
          type: "text" as const,
          text: `To generate a Terraform configuration for ${args.requirements || "any requirement"}, you must follow the PagoPA DX best practices.

You can find information about the "infrastructure folder structure", "Using DX terraform modules", "Using DX terraform provider" and other conventions by using the \`QueryPagoPADXDocumentation\` tool. For example, you can ask "what is the infrastructure folder structure?", but you must ask for the other information as well.
It's suggested to call the \`QueryPagoPADXDocumentation\` tool multiple times to gather all the necessary information using simple and scoped questions.

When generating the configuration, remember to:
1.  Use existing Terraform modules from the \`pagopa-dx\` namespace whenever possible. You can search for them using the \`searchModules\` tool.
2.  Strictly follow the correct folder structure for infrastructure resources.
3.  Generate HCL code that is clean, readable, and well-documented.`,
        },
      ],
    }),
    name: "generate-terraform-configuration",
  },
  tags: ["terraform", "infrastructure", "dx"],
  version: "1.0.0",
};
