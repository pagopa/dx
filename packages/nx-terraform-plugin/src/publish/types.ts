// Defines publish-related contracts used by the Terraform Nx plugin.
export interface ModulePublishManifest {
  version: string;
  description: string;
  provider?: string;
  github?: {
    owner?: string;
  };
}

export interface PublishOptions {
  mode: "github";
  github: {
    owner: string;
  };
}
