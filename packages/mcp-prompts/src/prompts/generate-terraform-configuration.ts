/**
 * Terraform Configuration Generator Prompt
 *
 * This prompt provides guidance for generating Terraform configurations that follow
 * PagoPA DX best practices and conventions. It acts as an intelligent assistant
 * that guides users through the process of creating infrastructure code.
 *
 * Key features:
 * - Integrates with PagoPA DX documentation via QueryPagoPADXDocumentation tool
 * - Promotes use of standardized DX modules from pagopa-dx namespace
 * - Enforces proper folder structure and naming conventions
 * - Provides contextual guidance based on user requirements
 */

import type { CatalogEntry } from "../types.js";

/**
 * Complete catalog entry for the Terraform configuration generator.
 * This follows the MCP prompt specification and includes all necessary metadata.
 */
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
    /**
     * Generates the actual prompt content based on user requirements.
     *
     * This function creates a structured prompt that:
     * 1. Acknowledges the user's specific requirements
     * 2. Provides step-by-step guidance for using DX tools
     * 3. Emphasizes best practices and conventions
     * 4. Returns formatted text content for the MCP client
     *
     * @param args - Object containing optional requirements string
     * @param args.requirements - User's specific infrastructure requirements
     * @returns Promise resolving to formatted guidance text
     */
    load: async (args: {
      requirements?: string;
    }) => `To generate a Terraform configuration for ${args.requirements || "any requirement"}, you must follow the PagoPA DX best practices.

You can find information about the "infrastructure folder structure", "Using DX terraform modules", "Using DX terraform provider" and other conventions by using the \`QueryPagoPADXDocumentation\` tool. For example, you can ask "what is the infrastructure folder structure?". You can ask for the other information you may need as well.
It's suggested to call the \`QueryPagoPADXDocumentation\` tool multiple times to gather all the necessary information using simple and scoped questions.

When generating the configuration, remember to:
1.  Always us existing Terraform modules from the \`pagopa-dx\` namespace for cloud resources you have to create (for example azure storage account use the terraform module pagopa-dx/azure-storage-account/azurerm). You can search for them using the \`searchModules\` tool.
2.  Always use the dx providers' functions and resources to set the name of cloud resources (using the resource_name function) and to set subnets cidrs (using the dx_available_subnet_cidr resource). You can search for them using the \`getProviderDocs\` tool.
3.  Strictly follow the correct folder structure for infrastructure resources.
4.  Generate HCL code that is clean, readable, and well-documented.`,
    name: "generate-terraform-configuration",
  },
  tags: ["terraform", "infrastructure", "dx"],
};
