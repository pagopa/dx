export interface Config {
  minVersions: {
    turbo: string;
  };
  repository: {
    root: string;
  };
}

export const getConfig = (repositoryRoot: string): Config => ({
  minVersions: {
    turbo: "2",
  },
  repository: {
    root: repositoryRoot,
  },
});
