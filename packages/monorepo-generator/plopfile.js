import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
} from "@logtape/logtape";

import { setDeploymentEnvironmentGenerator } from "./dist/index.js";

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
  setDeploymentEnvironmentGenerator(plop);
}
