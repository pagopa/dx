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
const getRootConfigPath = (root, configFileName) => path.relative(root, configFileName) || configFileName;
const getPublishTarget = (opts, root, publishManifest) => {
	try {
		const publishOptions = mergePublishOptions(opts.publish, publishManifest);
		return [opts.publishTargetName, {
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
const getTargets = (opts, root, projectType, hasRootTflintConfig, publishManifest) => {
	const rootTflintConfigPath = getRootConfigPath(root, ".tflint.hcl");
	const formatArgs = ["-list=true", "-recursive=true"];
	const cwd = "{projectRoot}";
	const inputs = [
		"default",
		"examples",
		"tests"
	];
	const targets = [
		[opts.initTargetName, {
			cache: true,
			command: `terraform init`,
			inputs,
			options: { cwd },
			outputs: ["{projectRoot}/.terraform", "{projectRoot}/.terraform.lock.hcl"]
		}],
		[opts.formatTargetName, {
			cache: true,
			command: `terraform fmt`,
			configurations: { ci: { args: [...formatArgs, "-check=true"] } },
			inputs,
			options: {
				args: [...formatArgs, "-write=true"],
				cwd
			}
		}],
		[opts.testTargetName, {
			cache: true,
			command: `terraform test`,
			dependsOn: [opts.initTargetName],
			inputs: ["default", "tests"],
			options: { cwd }
		}],
		[opts.validateTargetName, {
			cache: true,
			command: `terraform validate`,
			inputs,
			options: { cwd }
		}]
	];
	if (hasRootTflintConfig) targets.push([opts.lintTargetName, {
		cache: true,
		command: `tflint`,
		inputs: [...inputs, "{workspaceRoot}/.tflint.hcl"],
		options: {
			args: [
				"--disable-rule=terraform_required_version",
				"--disable-rule=terraform_required_providers",
				"--config",
				rootTflintConfigPath
			],
			cwd
		}
	}]);
	if (projectType === "library") {
		targets.push([opts.docsTargetName, {
			cache: true,
			command: `terraform-docs markdown table`,
			inputs: ["default", "{projectRoot}/README.md"],
			options: {
				args: [
					"--output-file",
					"README.md",
					"--output-mode",
					"inject",
					"--hide",
					"providers",
					"--lockfile=false",
					"."
				],
				cwd
			},
			outputs: ["{projectRoot}/README.md"]
		}]);
		if (publishManifest) {
			const publishTarget = getPublishTarget(opts, root, publishManifest);
			if (publishTarget) targets.push(publishTarget);
		}
	}
	targets.push([opts.consoleTargetName, {
		cache: false,
		command: `terraform console`,
		options: {
			cwd,
			tty: true
		}
	}], [opts.outputTargetName, {
		cache: false,
		command: `terraform output`,
		dependsOn: [opts.initTargetName],
		options: { cwd }
	}]);
	if (projectType === "application") targets.push([opts.planTargetName, {
		cache: false,
		configurations: { ci: {
			refresh: true,
			report: true,
			verbose: false
		} },
		dependsOn: [opts.initTargetName],
		executor: "@pagopa/nx-terraform-plugin:plan",
		options: {
			projectRoot: "{projectRoot}",
			refresh: true,
			report: false,
			verbose: true
		}
	}], [opts.applyTargetName, {
		cache: false,
		command: `terraform apply`,
		dependsOn: [opts.initTargetName],
		options: {
			cwd,
			tty: true
		}
	}]);
	return Object.fromEntries(targets);
};
const getProject = (opts, root, hasRootTflintConfig = false, publishManifest = void 0) => {
	const projectType = getProjectType(root);
	const isPublishableLibrary = projectType === "library" && publishManifest !== void 0;
	const targets = getTargets(opts, root, projectType, hasRootTflintConfig, publishManifest);
	const environmentTag = projectType === "application" ? getEnvironmentTag(root, opts.additionalEnvironments) : void 0;
	const tags = ["terraform", ...environmentTag ? [environmentTag] : []];
	if (isPublishableLibrary) tags.push("terraform:public");
	const config = {
		name: getProjectNameFromRoot(root),
		namedInputs: {
			default: ["{projectRoot}/*.{tf,tfvars}"],
			examples: ["{projectRoot}/examples/**/*.{tf,tfvars}"],
			tests: ["{projectRoot}/tests/**/*.{tf,tfvars}", "{projectRoot}/tests/**/*.tftest.hcl"]
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
const targetNameSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{2,}$/, { message: "Target names must be at least 3 characters, not start with a number, and contain only letters, numbers, or dashes" });
const environmentNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, { message: "Environment names must start with a lowercase letter or number and contain only lowercase letters, numbers, underscores, or dashes" });
const publishOptionsSchema = z.object({
	github: pluginPublishOptionsSchema.shape.github,
	mode: z.literal("github")
});
const terraformPluginOptionsSchema = z.object({
	additionalEnvironments: z.array(environmentNameSchema),
	applyTargetName: targetNameSchema,
	consoleTargetName: targetNameSchema,
	docsTargetName: targetNameSchema,
	formatTargetName: targetNameSchema,
	initTargetName: targetNameSchema,
	lintTargetName: targetNameSchema,
	outputTargetName: targetNameSchema,
	planTargetName: targetNameSchema,
	publish: publishOptionsSchema,
	publishTargetName: targetNameSchema,
	testTargetName: targetNameSchema,
	validateTargetName: targetNameSchema
});
const defaultOptions = {
	additionalEnvironments: [],
	applyTargetName: "tf-apply",
	consoleTargetName: "tf-console",
	docsTargetName: "terraform-docs",
	formatTargetName: "tf-fmt",
	initTargetName: "tf-init",
	lintTargetName: "tflint",
	outputTargetName: "tf-output",
	planTargetName: "tf-plan",
	publish: { mode: "github" },
	publishTargetName: "nx-release-publish",
	testTargetName: "tf-test",
	validateTargetName: "tf-validate"
};
const parseOptions = (options) => {
	const parseResult = terraformPluginOptionsSchema.partial().safeParse(options ?? {});
	if (!parseResult.success) {
		const validationErrors = parseResult.error.issues.map((issue) => {
			return `${issue.path.length > 0 ? issue.path.join(".") : "options"}: ${issue.message}`;
		}).join("; ");
		throw new Error(`Invalid Terraform plugin options: ${validationErrors}`);
	}
	const opts = {
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
	const seen = /* @__PURE__ */ new Map();
	const targetNames = Object.entries(opts).filter((entry) => entry[0].endsWith("TargetName"));
	for (const [key, value] of targetNames) {
		const existing = seen.get(value);
		if (existing) throw new Error(`Invalid Terraform plugin options: Target name "${value}" is duplicated for keys "${existing}" and "${key}"`);
		seen.set(value, key);
	}
	return opts;
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
	for (const configFile of configFiles) {
		const root = path.dirname(configFile);
		if (isIgnoredRoot(root)) continue;
		if (path.basename(configFile) === moduleManifestFileName) {
			moduleManifestRoots.add(root);
			continue;
		}
		terraformConfigFiles.push(configFile);
	}
	return {
		moduleManifestRoots,
		terraformConfigFiles
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
	const { moduleManifestRoots, terraformConfigFiles } = getDiscoveryState(configFiles);
	return {
		publishableManifestByRoot: await getPublishableManifestByRoot(Array.from(moduleManifestRoots), workspaceRoot),
		terraformConfigFiles
	};
};
const createNodesV2 = ["**/{*.tf,module.json}", async (configFiles, options, context) => {
	await configureLogger();
	const opts = parseOptions(options);
	const hasRootTflintConfig = await fileExists(path.join(context.workspaceRoot, ".tflint.hcl"));
	const { publishableManifestByRoot, terraformConfigFiles } = await getDiscoveryStateWithValidation(configFiles, context.workspaceRoot);
	return createNodesFromFiles((configFile) => {
		const root = path.dirname(configFile);
		if (isIgnoredRoot(root)) return { projects: {} };
		return { projects: { [root]: getProject(opts, root, hasRootTflintConfig, publishableManifestByRoot.get(root)) } };
	}, terraformConfigFiles, options, context);
}];
const createDependencies = async (opts, ctx) => {
	const filesToProcess = getTerraformProjectFiles(ctx.filesToProcess.projectFileMap);
	return (await Promise.all(filesToProcess.map(getStaticDependenciesFromFile))).flat();
};

//#endregion
export { createDependencies, createNodesV2, getDiscoveryState, getDiscoveryStateWithValidation, getPublishableManifestByRoot };