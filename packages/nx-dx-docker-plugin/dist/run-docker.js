#!/usr/bin/env node
const require_docker_image = require('./docker-image-BUMKa_QH.js');
const require_github_summary = require('./github-summary-tzT8H1pT.js');
let node_child_process = require("node:child_process");

//#region src/run-docker.ts
const getCommitSha = () => {
	try {
		return (0, node_child_process.execFileSync)("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).trim();
	} catch {
		return process.env.GITHUB_SHA ?? "unknown";
	}
};
const main = () => {
	const args = require_github_summary.parseArgs(process.argv.slice(2));
	const mode = args.mode;
	if (mode !== "build" && mode !== "push") {
		console.error(`[@pagopa/nx-dx-docker-plugin] Invalid --mode: ${mode} (expected "build" or "push").`);
		process.exit(1);
	}
	const projectRoot = args["project-root"];
	const projectDisplayName = args["project-display-name"];
	const imageName = args["image-name"];
	const defaultBranch = args["default-branch"];
	const imageAuthors = args["image-authors"];
	const imageUrl = args["image-url"];
	const tags = require_docker_image.computeImageTags(projectDisplayName, defaultBranch);
	if (mode === "push" && tags.length === 0) {
		console.log(`[@pagopa/nx-dx-docker-plugin] No CI tags detected for ${imageName} (not running in a GitHub Actions job) — skipping publish.`);
		process.exit(0);
	}
	const publishTags = tags.length > 0 ? tags : ["dev"];
	const labels = {
		authors: imageAuthors,
		created: (/* @__PURE__ */ new Date()).toISOString(),
		revision: getCommitSha(),
		source: imageUrl,
		title: projectDisplayName,
		url: imageUrl
	};
	const dockerArgs = [
		"build",
		".",
		"--file",
		`${projectRoot}/Dockerfile`,
		"--platform",
		"linux/amd64,linux/arm64"
	];
	if (mode === "build") dockerArgs.push("--tag", require_docker_image.getProjectSlug(projectRoot));
	for (const tag of publishTags) dockerArgs.push("--tag", `${imageName}:${tag}`);
	for (const [key, value] of Object.entries(labels)) dockerArgs.push("--label", `org.opencontainers.image.${key}=${value}`);
	dockerArgs.push("--provenance=false");
	if (mode === "push") {
		dockerArgs.push("--push");
		for (const [key, value] of Object.entries(labels)) dockerArgs.push("--annotation", `index,manifest:org.opencontainers.image.${key}=${value}`);
	}
	const exitCode = (0, node_child_process.spawnSync)("docker", dockerArgs, {
		env: {
			...process.env,
			DOCKER_BUILDKIT: "1",
			SOURCE_DATE_EPOCH: "0"
		},
		stdio: "inherit"
	}).status ?? 1;
	if (exitCode !== 0) require_github_summary.summarizeDockerFailure(projectDisplayName, mode, exitCode);
	else if (mode === "push") require_github_summary.summarizeDockerPush(projectDisplayName, imageName, publishTags);
	process.exit(exitCode);
};
main();

//#endregion