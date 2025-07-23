export interface Config {
  minVersions: {
    turbo: string;
  };
}

export const getConfig = (): Config => ({
  minVersions: {
    turbo: "2",
  },
});
