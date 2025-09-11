import { SemVer } from "semver";

export interface Config {
  terraform: {
    dxModules: {
      githubEnvironmentBootstrap: {
        fallbackVersion: SemVer;
      };
    };
    providers: {
      github: {
        fallbackVersion: SemVer;
      };
    };
  };
}

export const defaultConfig: Config = {
  terraform: {
    dxModules: {
      githubEnvironmentBootstrap: {
        fallbackVersion: new SemVer("1.1.0"),
      },
    },
    providers: {
      github: {
        fallbackVersion: new SemVer("6.0.0"),
      },
    },
  },
};
