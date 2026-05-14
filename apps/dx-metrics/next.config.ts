import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@pagopa/dx-metrics-core"],
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
