import { runPublishFromProcessArgs } from "../packages/nx-terraform-plugin/dist/publish/runtime.js";

await runPublishFromProcessArgs(process.argv.slice(2), process.cwd());
