import type { NextConfig } from "next";

import { z } from "zod";

import rawConfig from "./config.json";

const AppConfigSchema = z.object({
  repositories: z.array(z.string()).min(1),
});

const appConfig = AppConfigSchema.parse(rawConfig);

const configuredRepositories = appConfig.repositories;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_REPOSITORIES: configuredRepositories.join(","),
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
        protocol: "https",
      },
    ],
  },
  output: "standalone",
};

export default nextConfig;
