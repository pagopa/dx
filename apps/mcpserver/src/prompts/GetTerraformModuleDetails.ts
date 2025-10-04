export const GetTerraformModuleDetailsPrompt = {
  name: "get-terraform-module-details",
  description:
    "Get information about a Terraform module (inputs, outputs, description, etc.).",
  load: async () => {
    return `To get information about a Terraform module, please follow these steps:

1.  **Search for the module**: Use the \`searchModules\` tool to find the desired module in the Terraform registry. If you are looking for a module within the PagoPA ecosystem, it is likely in the \`pagopa-dx\` namespace. You can search for it using a query like \`pagopa-dx/<module-name>\`.

2.  **Get module details**: Once you have identified the correct module from the search results, copy its ID and use the \`moduleDetails\` tool to get all the information about it (inputs, outputs, description, etc.).

This process will give you all the necessary details for any Terraform module you need to use. It is recommended to prefer looking for the module's information on the registry with the said tools instead of getting only the example from the pagopa dx documentation.

Terraform modules also come with examples, which you can use to see a real-world implementation of the module.

Favor the usage of multiple modules instead of plain resources. If a module exists in the pagopa-dx namespace, use it instead of plain resources. Always search for modules in the pagopa-dx namespace before writing plain terraform resources.`;
  },
};
