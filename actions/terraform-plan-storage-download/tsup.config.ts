import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: {
    main: "src/main.ts",
    post: "src/post.ts",
  },
  format: ["cjs"],
  minify: true,
  noExternal: [/.*/],
  platform: "node",
  sourcemap: false,
  target: "node24",
  treeshake: true,
});
