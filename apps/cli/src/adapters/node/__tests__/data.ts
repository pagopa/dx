import { PackageJson } from "../../../domain/package-json.js";

export const makeMockPackageJson = (overrides: Partial<PackageJson> = {}) => {
  const basePackageJson = {
    dependencies: {
      aDependency: "^4.17.21",
      anotherDependency: "^8.0.0",
    },
    devDependencies: {
      turbo: "^2.5.2",
      typescript: "^5.0.0",
    },
    name: "aPackageName",
    scripts: {
      build: "tsc",
      "code-review": "eslint .",
    },
  };

  return { ...basePackageJson, ...overrides };
};
