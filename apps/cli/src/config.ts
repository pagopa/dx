export type Config = {
  minVersions: {
    nx: string;
  };
};

export const getConfig = (): Config => ({
  minVersions: {
    nx: "22",
  },
});
