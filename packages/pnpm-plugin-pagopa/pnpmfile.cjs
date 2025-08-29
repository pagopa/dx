module.exports = {
  hooks: {
    updateConfig(config) {
      config.workspacePackagePatterns ??= ["apps/*", "packages/*"];
      config.linkWorkspacePackages ??= true;
      config.packageImportMethod ??= "clone-or-copy";
      config.catalogs ??= {};
      config.catalogs.dx = {
        "@pagopa/eslint-config": "^5.0.0",
        "@vitest/coverage-v8": "^3.2.4",
        eslint: "^9.30.0",
        vitest: "^3.2.4",
      };
      return config;
    },
  },
};
