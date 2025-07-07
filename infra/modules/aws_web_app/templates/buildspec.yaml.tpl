version: 1
applications:
  - appRoot: ${app_root}
    frontend:
      phases:
        preBuild:
            commands: ${pre_build_commands}
        build:
            commands: ${build_commands}
      artifacts:
        baseDirectory: ${build_dir}
        files:
            - '**/*'
      buildPath: /
    