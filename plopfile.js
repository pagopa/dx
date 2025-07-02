/**
 * Root-level plopfile for the DX monorepo
 *
 * This file allows running `yarn plop` from the workspace root
 * to generate new packages using the generators.
 */

const typescriptBaseGenerator = require("./packages/typescript-base-generator/dist/index.cjs");
const typescriptLibraryGenerator = require("./packages/typescript-library-generator/dist/index.cjs");

module.exports = function (plop) {
  // add your generators here
  typescriptBaseGenerator(plop);
  typescriptLibraryGenerator(plop);
};
