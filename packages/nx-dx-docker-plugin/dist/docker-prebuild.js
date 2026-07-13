#!/usr/bin/env node
let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");

//#region src/docker-prebuild-args.ts
const projectsFilterSchema = zod_v4.z.string().min(1).regex(/^[A-Za-z0-9@][A-Za-z0-9@/_.,\s*-]*$/, "must be a comma/space-separated list of project names or patterns");
const parseDockerProjectsFilter = (rawProjectsFilter) => projectsFilterSchema.parse(rawProjectsFilter).split(/[,\s]+/).filter(Boolean);

//#endregion
//#region src/docker-prebuild.ts
const main = () => {
	const rawProjectsFilter = process.env.NX_RELEASE_DOCKER_PROJECTS;
	const args = rawProjectsFilter ? [
		"nx",
		"run-many",
		"-t",
		"docker:build",
		"-p",
		...parseDockerProjectsFilter(rawProjectsFilter)
	] : [
		"nx",
		"affected",
		"-t",
		"docker:build"
	];
	console.log(`[@pagopa/nx-dx-docker-plugin] Running: pnpm ${args.join(" ")}`);
	(0, node_child_process.execFileSync)("pnpm", args, { stdio: "inherit" });
};
main();

//#endregion