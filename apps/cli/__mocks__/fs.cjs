import { fs } from "memfs";

export default fs;
export const { readFileSync, writeFileSync } = fs;
