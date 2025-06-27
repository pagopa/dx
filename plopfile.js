/**
 * Root-level plopfile for the DX monorepo
 *
 * This file allows running `yarn plop` from the workspace root
 * to generate new packages using the @pagopa/plop-generator.
 */

const plopGenerator = require("./packages/plop-generator/dist/index.cjs");

module.exports = plopGenerator;
