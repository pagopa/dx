/**
 * Serialize strings as Terraform-compatible string literals.
 */
import { type NodePlopAPI } from "node-plop";

export default (plop: NodePlopAPI) => {
  plop.setHelper("terraformString", (value: string) => JSON.stringify(value));
};
