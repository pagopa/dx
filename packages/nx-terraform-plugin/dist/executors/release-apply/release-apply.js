import { t as createDefaultTaskDispatcher } from "../../default-dispatcher-BTdenmPC.js";
import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { z } from "zod/v4";

//#region src/executors/release-apply/schema.ts
const releaseApplyExecutorSchema = z.object({
	dryRun: z.boolean().default(false),
	projectRoot: z.string().min(1),
	report: z.boolean().default(false),
	sensitiveKeys: z.array(z.string().min(1)).default([]),
	verbose: z.boolean().default(false)
});

//#endregion
//#region src/executors/release-apply/release-apply.ts
const nxDryRunSchema = z.enum(["false", "true"]).optional();
const runExecutor = async (options) => {
	const logger = getPackageLogger(["release-apply"]);
	const parseResult = releaseApplyExecutorSchema.safeParse(options);
	const nxDryRunParseResult = nxDryRunSchema.safeParse(process.env.NX_DRY_RUN);
	await configureLogger();
	if (!parseResult.success) {
		logger.warn("Invalid release-apply options", {
			issues: parseResult.error.issues,
			path: options?.projectRoot ?? "release-apply options"
		});
		return { success: false };
	}
	if (!nxDryRunParseResult.success) {
		logger.warn("Invalid NX_DRY_RUN environment variable", { issues: nxDryRunParseResult.error.issues });
		return { success: false };
	}
	const { dryRun, projectRoot, report, sensitiveKeys, verbose } = parseResult.data;
	if (dryRun || nxDryRunParseResult.data === "true") {
		logger.info("Skipping Terraform apply during release dry run", { projectRoot });
		return { success: true };
	}
	await createDefaultTaskDispatcher().dispatchTask("terraformApply", {
		modulePath: projectRoot,
		report,
		sensitiveKeys,
		verbose
	});
	return { success: true };
};

//#endregion
export { runExecutor as default };