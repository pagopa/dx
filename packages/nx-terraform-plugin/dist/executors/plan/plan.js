import { t as createDefaultTaskDispatcher } from "../../default-dispatcher-CKKSPoCe.js";
import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { z } from "zod/v4";

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