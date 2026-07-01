/** This module defines the on-disk plan file name shared by the plan-upload and apply tasks. */

// terraformPlanUpload writes the plan to this fixed, project-relative path and
// uploads it as part of the plan bundle; terraformApply downloads the same
// bundle and looks for the plan file at this exact path before applying it.
export const PLAN_FILE_NAME = "tfplan.binary";
