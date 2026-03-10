import { readFileSync } from "node:fs";
import { join } from "node:path";

import { load } from "js-yaml";
import type { NextConfig } from "next";

interface AppConfig {
  repositories?: string[];
}

const isAppConfig = (value: unknown): value is Required<AppConfig> =>
  Boolean(
    value &&
      typeof value === "object" &&
      "repositories" in value &&
      Array.isArray(value.repositories) &&
      value.repositories.length > 0,
  );

const readConfiguredRepositories = () => {
  const configPath = join(process.cwd(), "config.yaml");
  const parsedConfig = load(readFileSync(configPath, "utf8"));

  if (!isAppConfig(parsedConfig)) {
    throw new Error("config.yaml must define a non-empty repositories list");
  }

  const repositories = parsedConfig.repositories.map((repository) => {
    if (typeof repository !== "string" || repository.trim().length === 0) {
      throw new Error("config.yaml repositories entries must be non-empty strings");
    }

    return repository.trim();
  });

  return repositories;
};

const configuredRepositories = readConfiguredRepositories();

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_REPOSITORIES: configuredRepositories.join(","),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
