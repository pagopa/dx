module.exports = {
  hooks: {
    updateConfig(config) {
      config.workspacePackagePatterns ??= ["apps/*", "packages/*"];
      config.linkWorkspacePackages ??= true;
      config.packageImportMethod ??= "clone-or-copy";
      config.cleanupUnusedCatalogs ??= true;
      config.catalogs ??= {};
      return config;
    },
  },
};
