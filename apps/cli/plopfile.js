import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
} from "@logtape/logtape";

import {
  setDeploymentEnvironmentGenerator,
  setMonorepoGenerator,
} from "./dist/adapters/plop/index.js";

await configure({
  loggers: [
    {
      category: ["gen", "env"],
      lowestLevel: "debug",
      sinks: ["console"],
    },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
  sinks: {
    console: getConsoleSink({
      formatter: ansiColorFormatter,
    }),
  },
});

export default function (plop) {
  setMonorepoGenerator(plop);
  setDeploymentEnvironmentGenerator(plop);
}
