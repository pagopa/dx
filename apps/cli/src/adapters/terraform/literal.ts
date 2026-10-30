/**
 * Encode data as HCL string literals without enabling template interpolation.
 */
export const terraformLiteral = (value: string): string =>
  JSON.stringify(value)
    .replaceAll("${", () => "$${")
    .replaceAll("%{", "%%{");
