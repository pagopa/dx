import { t as createDefaultTaskDispatcher } from "../../default-dispatcher-C_hICWDL.js";
import { n as getPackageLogger, t as configureLogger } from "../../logger-C2K7hHjS.js";
import { z } from "zod/v4";

//#region src/executors/apply/schema.ts
/** Defines the saved-plan input for the Terraform apply executor. */
const applyExecutorSchema = z.object({
	__unparsed__: z.array(z.string()).max(0, "Use --planFile=<file> instead of positional Terraform arguments").optional(),
	planFile: z.string().min(1).optional(),
	projectRoot: z.string().min(1)
});

//#endregion
//#region src/executors/apply/apply.ts
const runExecutor = async (options) => {
	await configureLogger();
	const parsed = applyExecutorSchema.safeParse(options);
	if (!parsed.success) {
		getPackageLogger(["apply"]).warn("Invalid apply options", { issues: parsed.error.issues });
		return { success: false };
	}
	await createDefaultTaskDispatcher().dispatchTask("terraformApply", {
		modulePath: parsed.data.projectRoot,
		planFile: parsed.data.planFile
	});
	return { success: true };
};

//#endregion
export { runExecutor as default };