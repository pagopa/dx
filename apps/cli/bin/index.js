#!/usr/bin/env node

import { runCli } from "../dist/index.js";
import packageJson from "../package.json" with { type: "json" };

runCli(packageJson.version).catch((error) => console.error(error.message));
