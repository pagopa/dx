/** @type {import('plop').NodePlopAPI} */
export default function (plop) {
  plop.setGenerator("Workspace", {
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Workspace name?",
      },
      {
        type: "confirm",
        name: "library",
        message: "Is this a library?",
        default: false,
      }
    ],
    actions: (data) => [
      {
        type: "addMany",
        destination: `${data.library ? `packages` : `apps`}/{{name}}`,
        templateFiles: "templates/workspace",
        base: "templates/workspace",
      }
    ]
  });

  plop.setGenerator("Terraform Module", {
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Terraform module name?",
        validate: (value) => value.length > 0,
      },
      {
        type: "input",
        name: "description",
        message: "Terraform module description?",
        default: ""
      }
    ],
    actions: [
      {
        type: "addMany",
        destination: "infra/modules/{{name}}",
        templateFiles: "templates/terraform-module",
        base: "templates/terraform-module",
      }
    ]
  });
};
