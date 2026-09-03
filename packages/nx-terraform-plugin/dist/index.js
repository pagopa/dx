import { n as getPackageLogger, t as configureLogger } from "./logger-DZ1KFLzv.js";
import { i as publishSchema, n as mergePublishOptions, r as pluginPublishOptionsSchema, t as PublishOptionsError } from "./publish-options-DI4KrjU0.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";
import { DependencyType, createNodesFromFiles } from "@nx/devkit";

//#region src/manifest.ts
const modulePublishManifestSchema = publishSchema.extend({ github: z.object({ owner: z.string().min(1).optional() }).optional() });
var ModulePublishManifestError = class extends Error {
	issues;
	reasons;
	constructor(issues, reasons) {
		super(reasons.join("; "));
		this.issues = issues;
		this.reasons = reasons;
		this.name = "ModulePublishManifestError";
	}
};
const parseModulePublishManifest = (input) => {
	const parseResult = modulePublishManifestSchema.safeParse(input);
	if (!parseResult.success) {
		const reasons = parseResult.error.issues.map((issue) => {
			return `${issue.path.join(".")}: ${issue.message}`;
		});
		throw new ModulePublishManifestError(parseResult.error.issues, reasons);
	}
	return parseResult.data;
};

//#endregion
//#region src/discovery.ts
const readModulePublishManifest = async (moduleRoot) => {
	const manifestPath = path.join(moduleRoot, "module.json");
	const logger = getPackageLogger(["discovery"]);
	try {
		const rawManifest = await fs.readFile(manifestPath, "utf-8");
		return parseModulePublishManifest(JSON.parse(rawManifest));
	} catch (error) {
		if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return;
		if (error instanceof SyntaxError) {
			logger.warn(`Invalid module manifest at ${manifestPath}. ${error.message}`);
			return;
		}
		if (error instanceof ModulePublishManifestError) {
			logger.warn("Invalid manifest file", {
				issues: error.issues,
				path: manifestPath
			});
			return;
		}
		throw error;
	}
};

//#endregion
//#region src/project.ts
const logger = getPackageLogger(["project"]);
const noTerraformTestCapabilities = {
	contract: false,
	e2e: false,
	integration: false,
	unit: false
};
const getTargetName = (opts, targetSuffix) => opts.targetNamePrefix === "" ? targetSuffix : `${opts.targetNamePrefix}-${targetSuffix}`;
const getProjectNameFromRoot = (root) => root.split(path.sep).reduce((acc, part, currentIndex, array) => {
	if (array.length > 1 && currentIndex === 0) return acc;
	if (part === "_modules") return [...acc, "modules"];
	return [...acc, part.replaceAll("_", "-")];
}, []).join("-");
const getProjectType = (root) => {
	const rootSegments = new Set(root.split(path.sep));
	return rootSegments.has("modules") || rootSegments.has("_modules") ? "library" : "application";
};
const defaultEnvironments = [
	"prod",
	"uat",
	"dev"
];
const getEnvironmentTag = (root, additionalEnvironments) => {
	const rootSegments = root.split(path.sep);
	const supportedEnvironments = /* @__PURE__ */ new Set([...defaultEnvironments, ...additionalEnvironments]);
	return `env:${rootSegments.find((segment) => supportedEnvironments.has(segment)) ?? "prod"}`;
};
const getPublishTarget = (opts, root, publishManifest) => {
	try {
		const publishOptions = mergePublishOptions(opts.publish, publishManifest);
		return ["nx-release-publish", {
			cache: false,
			executor: "@pagopa/nx-terraform-plugin:publish",
			options: {
				...publishOptions,
				githubOwner: publishOptions.github.owner,
				projectRoot: "{projectRoot}",
				useGitHubAppAuthentication: opts.publish.github?.owner !== void 0,
				workspaceRoot: "{workspaceRoot}"
			}
		}];
	} catch (error) {
		if (error instanceof PublishOptionsError) {
			logger.warn("Invalid publish options", {
				issues: error.issues,
				path: path.join(root, "module.json")
			});
			return;
		}
		throw error;
	}
};
const getTestTargets = (opts, cwd, testCapabilities) => {
	const targets = [];
	const initTargetName = getTargetName(opts, "init");
	if (testCapabilities.unit || testCapabilities.contract) targets.push([getTargetName(opts, "test"), {
		cache: true,
		command: `terraform test`,
		dependsOn: [initTargetName],
		inputs: [
			"default",
			"{projectRoot}/tests/unit.tftest.hcl",
			"{projectRoot}/tests/contract.tftest.hcl"
		],
		options: {
			args: ["-filter='tests/unit.tftest.hcl'", "-filter='tests/contract.tftest.hcl'"],
			cwd
		}
	}]);
	if (testCapabilities.integration) targets.push([getTargetName(opts, "test-integration"), {
		cache: true,
		command: `terraform test`,
		dependsOn: [initTargetName],
		inputs: [
			"default",
			"{projectRoot}/tests/integration.tftest.hcl",
			"{projectRoot}/tests/setup/**/*.{tf,tfvars}"
		],
		options: {
			args: ["-filter='tests/integration.tftest.hcl'"],
			cwd
		}
	}]);
	if (testCapabilities.e2e) targets.push([getTargetName(opts, "e2e"), {
		cache: true,
		command: `go test -v -timeout 1h ./tests`,
		dependsOn: [initTargetName],
		inputs: [
			"default",
			"{projectRoot}/tests/**/*",
			"{projectRoot}/examples/**/*"
		],
		options: { cwd }
	}]);
	return targets;
};
const getInitTarget = (projectType, initTargetName, cwd) => [initTargetName, projectType === "application" ? {
	cache: false,
	configurations: { ci: { frozenLockfile: true } },
	executor: "@pagopa/nx-terraform-plugin:init",
	inputs: ["default"],
	options: { projectRoot: "{projectRoot}" },
	outputs: [
		"{projectRoot}/.terraform",
		"{projectRoot}/.terraform.lock.hcl",
		"{projectRoot}/tfmodules.lock.json"
	]
} : {
	cache: true,
	command: `terraform init`,
	inputs: ["default"],
	options: { cwd },
	outputs: ["{projectRoot}/.terraform", "{projectRoot}/.terraform.lock.hcl"]
}];
const getTrivyTarget = (workspaceRoot, root) => ({
	cache: true,
	command: "trivy config",
	inputs: [
		"{projectRoot}/**/*.{tf,tfvars}",
		"{workspaceRoot}/trivy.yml",
		"{workspaceRoot}/.trivyignore",
		"{workspaceRoot}/.trivy/checks/terraform/**/*"
	],
	options: {
		args: [
			"--config",
			path.resolve(workspaceRoot, "trivy.yml"),
			root
		],
		cwd: "{workspaceRoot}"
	}
});
const getTargets = (opts, workspaceRoot, root, projectType, hasRootTflintConfig, publishManifest, testCapabilities) => {
	const formatArgs = ["-list=true", "-recursive=true"];
	const cwd = "{projectRoot}";
	const initTargetName = getTargetName(opts, "init");
	const targets = [getInitTarget(projectType, initTargetName, cwd), [getTargetName(opts, "fmt"), {
		cache: true,
		command: `terraform fmt`,
		configurations: { ci: { args: [...formatArgs, "-check=true"] } },
		inputs: ["default"],
		options: {
			args: [...formatArgs, "-write=true"],
			cwd
		}
	}]];
	targets.push(...getTestTargets(opts, cwd, testCapabilities));
	targets.push([getTargetName(opts, "validate"), {
		cache: true,
		command: `terraform validate`,
		dependsOn: [initTargetName],
		inputs: ["default", "examples"],
		options: { cwd }
	}]);
	targets.push([getTargetName(opts, "trivy"), getTrivyTarget(workspaceRoot, root)]);
	if (hasRootTflintConfig) targets.push([getTargetName(opts, "lint"), {
		cache: true,
		command: `tflint`,
		inputs: [
			"default",
			"examples",
			"{workspaceRoot}/.tflint.hcl",
			{ env: "TFLINT_PLUGIN_DIR" }
		],
		options: {
			cwd,
			env: { TFLINT_CONFIG_FILE: path.resolve(workspaceRoot, ".tflint.hcl") }
		}
	}]);
	if (projectType === "library") {
		targets.push([getTargetName(opts, "docs"), {
			cache: true,
			command: `terraform-docs markdown table .`,
			configurations: { ci: { "output-check": true } },
			inputs: ["default", "{projectRoot}/README.md"],
			options: {
				cwd,
				hide: "providers",
				lockfile: false,
				"output-file": "README.md",
				"output-mode": "inject"
			},
			outputs: ["{projectRoot}/README.md"]
		}]);
		if (publishManifest) {
			const publishTarget = getPublishTarget(opts, root, publishManifest);
			if (publishTarget) targets.push(publishTarget);
		}
	}
	targets.push([getTargetName(opts, "console"), {
		cache: false,
		command: `terraform console`,
		options: {
			cwd,
			tty: true
		}
	}], [getTargetName(opts, "output"), {
		cache: false,
		command: `terraform output`,
		dependsOn: [initTargetName],
		options: { cwd }
	}]);
	if (projectType === "application") targets.push([getTargetName(opts, "plan"), {
		cache: false,
		configurations: { ci: {
			refresh: true,
			report: true,
			verbose: false
		} },
		dependsOn: [initTargetName],
		executor: "@pagopa/nx-terraform-plugin:plan",
		options: {
			projectRoot: "{projectRoot}",
			refresh: true,
			report: false,
			verbose: true
		}
	}], [getTargetName(opts, "apply"), {
		cache: false,
		command: `terraform apply`,
		dependsOn: [initTargetName],
		options: {
			cwd,
			tty: true
		}
	}]);
	return Object.fromEntries(targets);
};
const getProject = (opts, workspaceRoot, root, hasRootTflintConfig = false, publishManifest = void 0, testCapabilities = noTerraformTestCapabilities) => {
	const projectType = getProjectType(root);
	const isPublishableLibrary = projectType === "library" && publishManifest !== void 0;
	const targets = getTargets(opts, workspaceRoot, root, projectType, hasRootTflintConfig, publishManifest, testCapabilities);
	const environmentTag = projectType === "application" ? getEnvironmentTag(root, opts.additionalEnvironments) : void 0;
	const tags = ["terraform", ...environmentTag ? [environmentTag] : []];
	if (isPublishableLibrary) tags.push("terraform:public");
	const config = {
		name: getProjectNameFromRoot(root),
		namedInputs: {
			default: ["{projectRoot}/*.{tf,tfvars}"],
			examples: ["{projectRoot}/examples/**/*.{tf,tfvars}"]
		},
		projectType,
		root,
		tags,
		targets
	};
	if (isPublishableLibrary) config.release = { version: {
		currentVersionResolver: "disk",
		manifestRootsToUpdate: ["{projectRoot}"],
		versionActions: "@pagopa/nx-terraform-plugin/release/version-actions"
	} };
	return config;
};

//#endregion
//#region src/hcl.ts
function getStaticDependencies(file, fileContent) {
	const dependencies = [];
	const moduleRegex = /module\s+"([^"]+)"\s*{[^}]*source\s*=\s*"([^"]+)"/g;
	let match;
	while ((match = moduleRegex.exec(fileContent)) !== null) {
		const [, , moduleSource] = match;
		if (moduleSource.startsWith(".")) dependencies.push({
			source: file.project,
			sourceFile: file.fileName,
			target: getProjectNameFromRoot(path.join(path.dirname(file.fileName), moduleSource)),
			type: DependencyType.static
		});
	}
	return dependencies;
}

//#endregion
//#region src/fs.ts
const getStaticDependenciesFromFile = async (file) => {
	const logger = getPackageLogger(["fs"]);
	try {
		return getStaticDependencies(file, await fs.readFile(file.fileName, "utf-8"));
	} catch (error) {
		logger.error("Error reading file {fileName}", {
			error,
			fileName: file.fileName
		});
		return [];
	}
};

//#endregion
//#region src/options.ts
const environmentNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, { message: "Environment names must start with a lowercase letter or number and contain only lowercase letters, numbers, underscores, or dashes" });
const publishOptionsSchema = z.object({
	github: pluginPublishOptionsSchema.shape.github,
	mode: z.literal("github")
});
const terraformPluginOptionsSchema = z.object({
	additionalEnvironments: z.array(environmentNameSchema),
	publish: publishOptionsSchema,
	targetNamePrefix: z.string()
});
const defaultOptions = {
	additionalEnvironments: [],
	publish: { mode: "github" },
	targetNamePrefix: ""
};
const parseOptions = (options) => {
	const parseResult = terraformPluginOptionsSchema.partial().safeParse(options ?? {});
	if (!parseResult.success) {
		const validationErrors = parseResult.error.issues.map((issue) => {
			return `${issue.path.length > 0 ? issue.path.join(".") : "options"}: ${issue.message}`;
		}).join("; ");
		throw new Error(`Invalid Terraform plugin options: ${validationErrors}`);
	}
	return {
		...defaultOptions,
		...parseResult.data,
		publish: {
			...defaultOptions.publish,
			...parseResult.data.publish,
			...parseResult.data.publish?.github ? { github: {
				...defaultOptions.publish.github,
				...parseResult.data.publish.github
			} } : {}
		}
	};
};

//#endregion
//#region src/project-file.ts
const getTerraformProjectFiles = (projectFileMap) => Object.entries(projectFileMap).flatMap(([project, files]) => files.map((fileData) => ({
	fileName: fileData.file,
	project
}))).filter(({ fileName }) => fileName.match(/\.tf$/));

//#endregion
//#region src/index.ts
const ignoreModules = [
	"tests",
	"_tests",
	"examples",
	"example"
];
const moduleManifestFileName = "module.json";
const testCapabilityByFileName = {
	"contract.tftest.hcl": "contract",
	"integration.tftest.hcl": "integration",
	"unit.tftest.hcl": "unit"
};
const emptyTestCapabilities = () => ({
	contract: false,
	e2e: false,
	integration: false,
	unit: false
});
const isIgnoredRoot = (root) => {
	const rootSegments = new Set(root.split(path.sep));
	return ignoreModules.some((module) => rootSegments.has(module));
};
const fileExists = async (filePath) => {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return false;
		throw error;
	}
};
const getDiscoveryState = (configFiles) => {
	const terraformConfigFiles = [];
	const moduleManifestRoots = /* @__PURE__ */ new Set();
	const testConfigFiles = [];
	const testCapabilitiesByRoot = /* @__PURE__ */ new Map();
	for (const configFile of configFiles) {
		const root = path.dirname(configFile);
		const fileName = path.basename(configFile);
		if (path.basename(root) === "tests") {
			testConfigFiles.push(configFile);
			continue;
		}
		if (isIgnoredRoot(root)) continue;
		if (fileName === moduleManifestFileName) {
			moduleManifestRoots.add(root);
			continue;
		}
		terraformConfigFiles.push(configFile);
	}
	const terraformRoots = new Set(terraformConfigFiles.map(path.dirname));
	for (const testConfigFile of testConfigFiles) {
		const testsRoot = path.dirname(testConfigFile);
		const projectRoot = path.dirname(testsRoot);
		if (!terraformRoots.has(projectRoot)) continue;
		const fileName = path.basename(testConfigFile);
		const capability = testCapabilityByFileName[fileName] ?? (fileName.endsWith("_test.go") ? "e2e" : void 0);
		if (capability === void 0) continue;
		const capabilities = testCapabilitiesByRoot.get(projectRoot) ?? emptyTestCapabilities();
		capabilities[capability] = true;
		testCapabilitiesByRoot.set(projectRoot, capabilities);
	}
	return {
		moduleManifestRoots,
		terraformConfigFiles,
		testCapabilitiesByRoot
	};
};
const getPublishableManifestByRoot = async (moduleManifestRoots, workspaceRoot) => {
	const validationResults = await Promise.all(moduleManifestRoots.map(async (root) => {
		const manifest = await readModulePublishManifest(path.join(workspaceRoot, root));
		return manifest ? [root, manifest] : null;
	}));
	return new Map(validationResults.filter((rootManifest) => rootManifest !== null));
};
const getDiscoveryStateWithValidation = async (configFiles, workspaceRoot) => {
	const { moduleManifestRoots, terraformConfigFiles, testCapabilitiesByRoot } = getDiscoveryState(configFiles);
	return {
		publishableManifestByRoot: await getPublishableManifestByRoot(Array.from(moduleManifestRoots), workspaceRoot),
		terraformConfigFiles,
		testCapabilitiesByRoot
	};
};
const createNodesV2 = ["**/{*.tf,module.json,tests/*.tftest.hcl,tests/*_test.go}", async (configFiles, options, context) => {
	await configureLogger();
	const opts = parseOptions(options);
	const hasRootTflintConfig = await fileExists(path.join(context.workspaceRoot, ".tflint.hcl"));
	const { publishableManifestByRoot, terraformConfigFiles, testCapabilitiesByRoot } = await getDiscoveryStateWithValidation(configFiles, context.workspaceRoot);
	return createNodesFromFiles((configFile) => {
		const root = path.dirname(configFile);
		if (isIgnoredRoot(root)) return { projects: {} };
		return { projects: { [root]: getProject(opts, context.workspaceRoot, root, hasRootTflintConfig, publishableManifestByRoot.get(root), testCapabilitiesByRoot.get(root)) } };
	}, terraformConfigFiles, options, context);
}];
const createDependencies = async (opts, ctx) => {
	const filesToProcess = getTerraformProjectFiles(ctx.filesToProcess.projectFileMap);
	return (await Promise.all(filesToProcess.map(getStaticDependenciesFromFile))).flat();
};

//#endregion
export { createDependencies, createNodesV2, getDiscoveryState, getDiscoveryStateWithValidation, getPublishableManifestByRoot };