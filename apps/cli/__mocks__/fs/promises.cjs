import { fs } from "memfs";

export default fs.promises;
// Export here all the used methods we want to mock
export const { readFile, stat } = fs.promises;
