import path from "node:path";
import { fileURLToPath } from "node:url";
import { ActionType, NodePlopAPI } from "plop";

const getPrompts = () => [
  {
    default: process.cwd(),
    message: "Where do you want to create the repository?",
    name: "repoSrc",
  },
  {
    message: "What is the repository name?",
    name: "repoName",
  },
];

const getDotFiles = (templatesPath: string): ActionType[] => [
  {
    path: "{{repoSrc}}/{{repoName}}/.editorconfig",
    templateFile: path.join(templatesPath, ".editorconfig"),
    type: "add",
  },
];

const getActions = (templatesPath: string): ActionType[] => [
  ...getDotFiles(templatesPath),
];

const scaffoldMonorepo = (plopApi: NodePlopAPI) => {
  const entryPointDirectory = path.dirname(fileURLToPath(import.meta.url));
  const templatesPath = path.join(entryPointDirectory, "monorepo");

  const prompts = getPrompts();
  const actions = getActions(templatesPath);

  plopApi.setGenerator("monorepo", {
    actions,
    description: "A scaffold for a monorepo repository",
    prompts,
  });
};

export default scaffoldMonorepo;
