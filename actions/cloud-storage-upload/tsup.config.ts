import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: {
    main: "src/main.ts",
  },
  format: ["cjs"],
  minify: true,
  noExternal: [/.*/],
  platform: "node",
  sourcemap: false,
  target: "node22",
  treeshake: true,
});
