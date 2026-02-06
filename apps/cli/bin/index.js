#!/usr/bin/env node

import { configure, getConsoleSink } from "@logtape/logtape";
import { runCli } from "../dist/index.js";
import packageJson from "../package.json" with { type: "json" };

await configure({
  loggers: [
    { category: ["dx-cli"], lowestLevel: "info", sinks: ["console"] },
    { category: ["savemoney"], lowestLevel: "debug", sinks: ["console"] },
    { category: ["json"], lowestLevel: "info", sinks: ["rawJson"] },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
  sinks: {
    console: getConsoleSink(),
    rawJson(record) {
      console.log(record.rawMessage);
    },
  },
});

runCli(packageJson.version).catch((error) => console.error(error.message));
