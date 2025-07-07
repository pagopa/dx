export interface Config {
  minVersions: {
    turbo: string;
  };
}

export const makeConfig = (): Config => ({
  minVersions: {
    turbo: "2",
  },
});
