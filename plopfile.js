/**
 * Root-level plopfile for the DX monorepo
 *
 * This file allows running `yarn plop` from the workspace root
 * to generate new packages using the @pagopa/typescript-generator.
 */

const typescriptGenerator = require("./packages/typescript-generator/dist/index.cjs");

module.exports = function (plop) {
  // add your generators here
  typescriptGenerator(plop);
};
