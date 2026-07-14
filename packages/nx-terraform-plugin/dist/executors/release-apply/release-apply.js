import { t as createDefaultTaskDispatcher } from "../../default-dispatcher-4u-PU-hx.js";
import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { z } from "zod/v4";

//#region src/executors/release-apply/schema.ts
const releaseApplyExecutorSchema = z.object({
	projectRoot: z.string().min(1),
	report: z.boolean().default(false),
	sensitiveKeys: z.array(z.string().min(1)).default([]),
	verbose: z.boolean().default(false)
});

//#endregion
//#region src/executors/release-apply/release-apply.ts
const runExecutor = async (options) => {
	const logger = getPackageLogger(["release-apply"]);
	const parseResult = releaseApplyExecutorSchema.safeParse(options);
	await configureLogger();
	if (!parseResult.success) {
		logger.warn("Invalid release-apply options", {
			issues: parseResult.error.issues,
			path: options?.projectRoot ?? "release-apply options"
		});
		return { success: false };
	}
	const { projectRoot, report, sensitiveKeys, verbose } = parseResult.data;
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