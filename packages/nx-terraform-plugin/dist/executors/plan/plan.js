import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import fs from "node:fs/promises";
import path from "node:path";
import * as z$1 from "zod/mini";
import { Octokit } from "octokit";
import util from "node:util";
import childProcess from "node:child_process";
import { z } from "zod/v4";

//#region ../dx-tasks/src/dispatcher.ts
const createTaskDispatcher = ({ context = {} } = {}) => {
	const tasks = /* @__PURE__ */ new Map();
	const registerTask = (task) => {
		if (tasks.has(task.name)) throw new Error(`Task "${task.name}" is already registered`);
		tasks.set(task.name, { dispatch: async (payload) => {
			const decodedPayload = task.payloadSchema.parse(payload);
			return task.run(decodedPayload, context);
		} });
	};
	const dispatchTask = async (name, payload) => {
		const task = tasks.get(name);
		if (!task) throw new Error(`Unknown task "${name}"`);
		return task.dispatch(payload);
	};
	return {
		dispatchTask,
		registerTask
	};
};

//#endregion
//#region ../dx-tasks/src/report-store.ts
/** This module stores and renders dx-tasks reports under a per-namespace directory tree. */
const nonEmptyStringSchema$2 = z$1.string().check(z$1.minLength(1));
const readReports = async (directoryPath) => {
	let entries;
	try {
		entries = await fs.readdir(directoryPath);
	} catch (cause) {
		if (cause instanceof Error && cause.code === "ENOENT") return [];
		throw new Error(`Failed to read report directory "${directoryPath}"`, { cause });
	}
	return Promise.all(entries.filter((entry) => entry.endsWith(".json")).sort((a, b) => a.localeCompare(b)).map(async (fileName) => {
		const filePath = path.join(directoryPath, fileName);
		try {
			return JSON.parse(await fs.readFile(filePath, "utf8"));
		} catch (cause) {
			throw new Error(`Failed to read report file "${filePath}"`, { cause });
		}
	}));
};
var ReportStore = class {
	namespaces = /* @__PURE__ */ new Map();
	rootDirectoryPath;
	constructor(baseDirectoryPath = process.cwd()) {
		this.rootDirectoryPath = path.join(baseDirectoryPath, ".dx-tasks");
	}
	register(namespace) {
		const name = nonEmptyStringSchema$2.parse(namespace.name);
		if (this.namespaces.has(name)) throw new Error(`Report namespace "${name}" is already registered`);
		this.namespaces.set(name, namespace);
		return this;
	}
	async render(format = "markdown") {
		const sections = [];
		for (const namespace of this.namespaces.values()) {
			const renderReports = namespace.renderers?.[format];
			if (!renderReports) continue;
			const reports = (await readReports(path.join(this.rootDirectoryPath, namespace.name))).map((report) => namespace.schema.parse(report));
			if (reports.length === 0) continue;
			sections.push(renderReports(reports));
		}
		return sections.join("\n\n");
	}
	async write(namespaceName, objectName, content) {
		const name = nonEmptyStringSchema$2.parse(namespaceName);
		const namespace = this.namespaces.get(name);
		if (!namespace) throw new Error(`Report namespace "${name}" is not registered`);
		const report = namespace.schema.parse(content);
		const directoryPath = path.join(this.rootDirectoryPath, name);
		const filePath = path.join(directoryPath, `${nonEmptyStringSchema$2.parse(objectName)}.json`);
		try {
			await fs.mkdir(directoryPath, { recursive: true });
		} catch (cause) {
			throw new Error(`Failed to create reporter namespace directory "${directoryPath}"`, { cause });
		}
		try {
			await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
		} catch (cause) {
			throw new Error(`Failed to write reporter file "${filePath}"`, { cause });
		}
	}
};

//#endregion
//#region ../dx-tasks/src/github/pr-comment.ts
/** This module creates GitHub PR comments as a reusable dx-tasks task. */
const nonEmptyStringSchema$1 = z$1.string().check(z$1.minLength(1));
const prCommentPayloadShape = {
	commentBody: nonEmptyStringSchema$1,
	footer: z$1.optional(nonEmptyStringSchema$1),
	githubToken: z$1.optional(nonEmptyStringSchema$1),
	issueNumber: z$1.number().check(z$1.int(), z$1.positive()),
	owner: nonEmptyStringSchema$1,
	repo: nonEmptyStringSchema$1,
	searchPattern: z$1.optional(nonEmptyStringSchema$1),
	title: z$1.optional(nonEmptyStringSchema$1)
};
const payloadSchema$3 = z$1.object(prCommentPayloadShape);
const githubCommentShape = {
	body: z$1.optional(z$1.nullable(z$1.string())),
	id: z$1.number().check(z$1.int(), z$1.positive())
};
const githubCreatedCommentSchema = z$1.object({
	...githubCommentShape,
	html_url: z$1.string().check(z$1.minLength(1))
});
const githubCommentsSchema = z$1.array(z$1.object(githubCommentShape));
var OctokitPrCommentClient = class {
	octokit;
	constructor(token) {
		this.octokit = new Octokit({ auth: token });
	}
	async createComment({ issueNumber, owner, repo }, body) {
		const { data } = await this.octokit.rest.issues.createComment({
			body,
			issue_number: issueNumber,
			owner,
			repo
		});
		const comment = githubCreatedCommentSchema.parse(data);
		return {
			commentId: comment.id,
			commentUrl: comment.html_url
		};
	}
	async deleteComment(owner, repo, commentId) {
		await this.octokit.rest.issues.deleteComment({
			comment_id: commentId,
			owner,
			repo
		});
	}
	async listComments({ issueNumber, owner, repo }) {
		const comments = await this.octokit.paginate(this.octokit.rest.issues.listComments, {
			issue_number: issueNumber,
			owner,
			per_page: 100,
			repo
		});
		return githubCommentsSchema.parse(comments);
	}
};
const createOctokitPrCommentClient = (token) => new OctokitPrCommentClient(token);
const deleteMatchingComments = async (client, target, searchPattern) => {
	const normalizedPattern = searchPattern.trim().toLowerCase();
	const matchingComments = (await client.listComments(target)).filter((comment) => (comment.body ?? "").toLowerCase().includes(normalizedPattern));
	for (const comment of matchingComments) await client.deleteComment(target.owner, target.repo, comment.id);
};
const getGitHubToken = (githubToken) => {
	const token = githubToken ?? process.env.GITHUB_TOKEN;
	if (!token) throw new Error("GitHub token not found. Please provide githubToken or GITHUB_TOKEN environment variable");
	return token;
};
const formatCommentBody = ({ commentBody, footer, title }) => {
	const titledBody = title === void 0 ? commentBody : `## ${title}\n\n${commentBody}`;
	return footer === void 0 ? titledBody : `${titledBody}\n\n---\n\n${footer}`;
};
async function prComment({ commentBody, footer, githubToken, issueNumber, owner, repo, searchPattern, title }, context = {}, createClient = createOctokitPrCommentClient) {
	const target = {
		issueNumber,
		owner,
		repo
	};
	const client = createClient(getGitHubToken(githubToken));
	if (searchPattern) try {
		await deleteMatchingComments(client, target, searchPattern);
	} catch (error) {
		console.warn(`Failed to delete existing comments: ${error instanceof Error ? error.message : String(error)}`);
	}
	return client.createComment(target, formatCommentBody({
		commentBody,
		footer,
		title
	}));
}

//#endregion
//#region ../dx-tasks/src/render-report.ts
/** This module renders persisted dx-tasks reports and prints them to stdout. */
const renderReportPayloadShape = { format: z$1._default(z$1.literal("markdown"), "markdown") };
const payloadSchema$2 = z$1.object(renderReportPayloadShape);
async function renderReport({ format = "markdown" }, context = {}) {
	if (!context.reports) throw new Error("renderReport requires reports in the task context");
	const renderedReport = await context.reports.render(format);
	console.log(renderedReport);
}

//#endregion
//#region ../dx-tasks/src/report-pr-comment.ts
/** This module renders persisted dx-tasks reports and posts them as GitHub PR comments. */
const nonEmptyStringSchema = z$1.string().check(z$1.minLength(1));
const reportPrCommentPayloadShape = {
	footer: z$1.optional(nonEmptyStringSchema),
	format: z$1._default(z$1.literal("markdown"), "markdown"),
	githubToken: z$1.optional(nonEmptyStringSchema),
	issueNumber: z$1.number().check(z$1.int(), z$1.positive()),
	owner: nonEmptyStringSchema,
	repo: nonEmptyStringSchema,
	searchPattern: z$1.optional(nonEmptyStringSchema),
	title: z$1.optional(nonEmptyStringSchema)
};
const payloadSchema$1 = z$1.object(reportPrCommentPayloadShape);
async function reportPrComment({ footer, format = "markdown", githubToken, issueNumber, owner, repo, searchPattern, title }, context = {}, createClient) {
	if (!context.reports) throw new Error("reportPrComment requires reports in the task context");
	const renderedReport = await context.reports.render(format);
	if (renderedReport.trim().length === 0) return;
	return prComment({
		commentBody: renderedReport,
		footer,
		githubToken,
		issueNumber,
		owner,
		repo,
		searchPattern,
		title
	}, context, createClient);
}

//#endregion
//#region ../dx-tasks/src/run-command.ts
/** This module wraps child-process execution for dx-tasks Terraform commands. */
const runCommand = async (command, args, cwd, env) => {
	const { promise, reject, resolve } = Promise.withResolvers();
	const child = childProcess.spawn(command, args, {
		cwd,
		env: {
			...process.env,
			...env
		},
		stdio: [
			"inherit",
			"pipe",
			"pipe"
		]
	});
	let stderr = "";
	let stdout = "";
	child.stderr?.setEncoding("utf8");
	child.stderr?.on("data", (chunk) => {
		stderr += chunk;
	});
	child.stdout?.setEncoding("utf8");
	child.stdout?.on("data", (chunk) => {
		stdout += chunk;
	});
	child.on("error", reject);
	child.on("close", (exitCode, signal) => {
		if (signal) {
			resolve({
				exitCode: null,
				signal,
				stderr,
				stdout
			});
			return;
		}
		if (exitCode !== null) {
			resolve({
				exitCode,
				signal: null,
				stderr,
				stdout
			});
			return;
		}
		reject(/* @__PURE__ */ new Error(`${command} closed without an exit code or signal`));
	});
	return promise;
};

//#endregion
//#region ../dx-tasks/src/terraform/mask-output.ts
/** This module masks sensitive Terraform output before dx-tasks prints it. */
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const beginPemMarker = "-----BEGIN ";
const endPemMarker = "-----END ";
const pemDelimiter = "-----";
const maskPemBlocks = (input) => {
	const normalizedInput = input.toUpperCase();
	let masked = "";
	let cursor = 0;
	while (cursor < input.length) {
		const beginIndex = normalizedInput.indexOf(beginPemMarker, cursor);
		if (beginIndex === -1) return `${masked}${input.slice(cursor)}`;
		const beginTypeEnd = normalizedInput.indexOf(pemDelimiter, beginIndex + 11);
		if (beginTypeEnd === -1) return `${masked}${input.slice(cursor)}`;
		const endIndex = normalizedInput.indexOf(endPemMarker, beginTypeEnd + 5);
		if (endIndex === -1) return `${masked}${input.slice(cursor)}`;
		const endTypeEnd = normalizedInput.indexOf(pemDelimiter, endIndex + 9);
		if (endTypeEnd === -1) return `${masked}${input.slice(cursor)}`;
		masked += `${input.slice(cursor, beginIndex)}[REDACTED]`;
		cursor = endTypeEnd + 5;
	}
	return masked;
};
const maskOutput = (input, additionalKeys = []) => {
	const keys = additionalKeys.map((k) => k.trim()).filter((k) => k.length > 0);
	let masked = input;
	for (const key of keys) {
		const escapedKey = escapeRegExp(key);
		const diffRegex = new RegExp(`("?${escapedKey}[^"]*"?\\s*=\\s*)"[^"]*"(\\s*->\\s*)"[^"]*"`, "ig");
		masked = masked.replace(diffRegex, "$1\"[REDACTED]\"$2\"[REDACTED]\"");
		const normalRegex = new RegExp(`("?${escapedKey}[^"]*"?\\s*=\\s*)"[^"]*"`, "ig");
		masked = masked.replace(normalRegex, "$1\"[REDACTED]\"");
	}
	masked = maskPemBlocks(masked);
	const knownSecretsPattern = "(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)";
	const hardcodedDiffRegex = new RegExp(`("?[^"\\s]*${knownSecretsPattern}([^A-Za-z0-9]|$)"?\\s*[:=]\\s*)"([^"]{12,})"(\\s*->\\s*)"([^"]{12,})"`, "ig");
	masked = masked.replace(hardcodedDiffRegex, "$1\"[REDACTED]\"$5\"[REDACTED]\"");
	const hardcodedNormalRegex = new RegExp(`("?[^"\\s]*${knownSecretsPattern}([^A-Za-z0-9]|$)"?\\s*[:=]\\s*)"([^"]{12,})"`, "ig");
	masked = masked.replace(hardcodedNormalRegex, "$1\"[REDACTED]\"");
	return masked;
};

//#endregion
//#region ../dx-tasks/src/terraform/plan.ts
/** This module runs Terraform plans for dx-tasks without external process helpers. */
const TERRAFORM_PLAN_NAMESPACE = "terraform-plan";
const terraformPlanPayloadShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	out: z$1.optional(z$1.string().check(z$1.minLength(1))),
	refresh: z$1._default(z$1.boolean(), true),
	report: z$1._default(z$1.boolean(), false),
	verbose: z$1._default(z$1.boolean(), false)
};
const payloadSchema = z$1.object(terraformPlanPayloadShape);
const terraformPlanReportShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	notices: z$1.array(z$1.object({
		message: z$1.string().check(z$1.minLength(1)),
		severity: z$1.union([z$1.literal("warning"), z$1.literal("error")])
	})),
	planOutput: z$1.string(),
	success: z$1._default(z$1.boolean(), true),
	summaryLine: z$1.optional(z$1.string().check(z$1.minLength(1)))
};
const terraformPlanReportSchema = z$1.object(terraformPlanReportShape);
const noPlanOutputMessage = "No plan output available.";
const renderTerraformPlanReports = (reports) => reports.map(renderTerraformPlanReport).join("\n\n").trim();
const renderTerraformPlanReport = ({ modulePath, notices, planOutput, success, summaryLine }) => {
	const heading = `### Terraform Plan: \`${modulePath}\` - ${success ? "✅ Success" : "❌ Failed"}`;
	const renderedNotices = notices.map(renderNoticeMarkdown);
	const details = `<details>
<summary>Show full plan</summary>

\`\`\`hcl
${planOutput}
\`\`\`

</details>`;
	if (renderedNotices.length > 0) return `${heading}\n${renderedNotices.join("\n\n")}${summaryLine ? `\n\n${summaryLine}` : ""}\n\n${details}`;
	return `${heading}${summaryLine ? `\n${summaryLine}` : ""}\n\n${details}`;
};
const terraformPlanReportNamespace = {
	name: TERRAFORM_PLAN_NAMESPACE,
	renderers: { markdown: renderTerraformPlanReports },
	schema: terraformPlanReportSchema
};
const isRunningInCI = () => {
	const ci = process.env.CI;
	return Boolean(ci) && ci !== "false" && ci !== "0";
};
const getMaskedOutputOrFallback = (maskedOutput) => maskedOutput.trim().length > 0 ? maskedOutput : noPlanOutputMessage;
const getPlanOutput = (maskedOutput, verbose) => {
	if (verbose) return getMaskedOutputOrFallback(maskedOutput);
	return maskedOutput.match(/(?:^.*Terraform will perform the following actions:[\s\S]*|^.*Terraform planned the following actions, but then encountered a problem:[\s\S]*|^.*No changes\..*)/m)?.[0] ?? getMaskedOutputOrFallback(maskedOutput);
};
const getPlanSummaryLine = (maskedOutput) => util.stripVTControlCharacters(maskedOutput).match(/^Plan:\s+.+$/m)?.[0];
const noticeStartPattern = /^(?:│\s*)?(Warning|Error):/;
const getNoticeSeverity = (line) => {
	const [, severity] = noticeStartPattern.exec(line) ?? [];
	if (severity === "Warning") return "warning";
	if (severity === "Error") return "error";
};
const isPlanSectionStart = (line) => /^(?:Terraform used the selected providers|Terraform will perform the following actions:|Terraform planned the following actions, but then encountered a problem:|No changes\.|Plan:\s+)/.test(line);
const normalizeNoticeLine = (line) => line.replace(/^│ ?/, "");
const getPlanNotices = (maskedOutput) => {
	const lines = util.stripVTControlCharacters(maskedOutput).split(/\r?\n/);
	const notices = [];
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const severity = getNoticeSeverity(lines[lineIndex] ?? "");
		if (!severity) continue;
		const messageLines = [];
		for (let noticeLineIndex = lineIndex; noticeLineIndex < lines.length; noticeLineIndex += 1) {
			const line = lines[noticeLineIndex] ?? "";
			const isFirstLine = noticeLineIndex === lineIndex;
			if (!isFirstLine && getNoticeSeverity(line)) {
				lineIndex = noticeLineIndex - 1;
				break;
			}
			if (!isFirstLine && (line === "╵" || isPlanSectionStart(line))) {
				lineIndex = noticeLineIndex - 1;
				break;
			}
			messageLines.push(normalizeNoticeLine(line));
			lineIndex = noticeLineIndex;
		}
		const message = messageLines.join("\n").trim();
		if (message.length > 0) notices.push({
			message,
			severity
		});
	}
	return notices;
};
const renderNoticeMarkdown = ({ message, severity }) => {
	return `> [!${severity === "warning" ? "WARNING" : "CAUTION"}]\n${message.split("\n").map((line) => `> ${line}`).join("\n")}`;
};
const getFailureMessage = (result) => {
	if (result.signal) return `Terraform plan terminated by signal ${result.signal}`;
	if (result.exitCode !== 0) return `Terraform plan exited with code ${result.exitCode}`;
	return noPlanOutputMessage;
};
const executeTerraformPlan = async (modulePath, env, verbose, report, context) => {
	const result = await runCommand("terraform", ["plan"], modulePath, env);
	if (result.signal) throw new Error(getFailureMessage(result));
	const maskedOutput = maskOutput([result.stdout, result.stderr].filter((output) => output.trim().length > 0).join("\n"));
	const planOutput = getPlanOutput(maskedOutput, verbose);
	const notices = getPlanNotices(maskedOutput);
	const summaryLine = getPlanSummaryLine(maskedOutput);
	console.log(planOutput);
	if (report && context.reports) await context.reports.write(TERRAFORM_PLAN_NAMESPACE, Buffer.from(modulePath).toString("base64url"), {
		modulePath,
		notices,
		planOutput: util.stripVTControlCharacters(planOutput),
		success: result.exitCode === 0,
		...summaryLine ? { summaryLine } : {}
	});
	if (result.exitCode !== 0) throw new Error(getFailureMessage(result));
};
async function terraformPlan({ modulePath, out, refresh = true, report = false, verbose = false }, context = {}) {
	const args = /* @__PURE__ */ new Map();
	const env = {};
	args.set("lock-timeout", "120s");
	if (out) args.set("out", out);
	if (!refresh) {
		args.set("refresh", "false");
		args.set("lock", "false");
	}
	if (!verbose) env.TF_IN_AUTOMATION = "true";
	if (isRunningInCI()) {
		args.set("input", "false");
		args.set("no-color", true);
		env.TF_IN_AUTOMATION = "true";
	}
	env.TF_CLI_ARGS_plan = args.entries().reduce((acc, [key, value]) => `${acc}-${key}${value === true ? "" : `=${value}`} `, "");
	await executeTerraformPlan(modulePath, env, verbose, report, context);
}

//#endregion
//#region ../dx-tasks/src/tasks.ts
const terraformPlanTask = {
	name: "terraformPlan",
	payloadSchema,
	run: terraformPlan
};
const renderReportTask = {
	name: "renderReport",
	payloadSchema: payloadSchema$2,
	run: renderReport
};
const reportPrCommentTask = {
	name: "reportPrComment",
	payloadSchema: payloadSchema$1,
	run: reportPrComment
};
const prCommentTask = {
	name: "prComment",
	payloadSchema: payloadSchema$3,
	run: prComment
};

//#endregion
//#region ../dx-tasks/src/default-dispatcher.ts
/** This module wires the default dx-tasks registry with built-in task definitions. */
const createDefaultReportStore = () => new ReportStore(process.cwd()).register(terraformPlanReportNamespace);
const createDefaultTaskDispatcher = ({ reports = createDefaultReportStore() } = {}) => {
	const dispatcher = createTaskDispatcher({ context: { reports } });
	dispatcher.registerTask(terraformPlanTask);
	dispatcher.registerTask(renderReportTask);
	dispatcher.registerTask(reportPrCommentTask);
	dispatcher.registerTask(prCommentTask);
	return dispatcher;
};

//#endregion
//#region src/executors/plan/schema.ts
const planExecutorSchema = z.object({
	out: z.string().min(1).optional(),
	projectRoot: z.string().min(1),
	refresh: z.boolean().default(true),
	report: z.boolean().default(false),
	verbose: z.boolean().default(false)
});

//#endregion
//#region src/executors/plan/plan.ts
const runExecutor = async (options) => {
	const logger = getPackageLogger(["plan"]);
	const parseResult = planExecutorSchema.safeParse(options);
	await configureLogger();
	if (!parseResult.success) {
		logger.warn("Invalid plan options", {
			issues: parseResult.error.issues,
			path: options.projectRoot ?? "plan options"
		});
		return { success: false };
	}
	const { out, projectRoot, refresh, report, verbose } = parseResult.data;
	await createDefaultTaskDispatcher().dispatchTask("terraformPlan", {
		modulePath: projectRoot,
		out,
		refresh,
		report,
		verbose
	});
	return { success: true };
};

//#endregion
export { runExecutor as default };