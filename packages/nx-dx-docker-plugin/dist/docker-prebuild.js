#!/usr/bin/env node
let node_child_process = require("node:child_process");

//#region src/docker-prebuild.ts
const main = () => {
	const projectsFilter = process.env.NX_RELEASE_DOCKER_PROJECTS;
	const command = projectsFilter ? `pnpm nx run-many -t docker:build -p ${projectsFilter}` : `pnpm nx affected -t docker:build`;
	console.log(`[@pagopa/nx-dx-docker-plugin] Running: ${command}`);
	(0, node_child_process.execSync)(command, { stdio: "inherit" });
};
main();

//#endregion