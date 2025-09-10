// Import built-in Node.js modules. No external dependencies needed.
const { spawn } = require('child_process');
const { appendFileSync, writeFileSync, rmSync } = require('fs');
const path = require('path');

// ==============================================================================
//  FILTER RULES LIST
// ==============================================================================
const FILTER_RULES = [
  // --- Azure Rules ---
  { regex: /("?hidden-link"?\s*[:=]\s*)".*?"/gi, replacement: '$1"[SENSITIVE_VALUE]"' },
  { regex: /("?APPINSIGHTS_INSTRUMENTATIONKEY"?\s*[:=]\s*)".*?"/gi, replacement: '$1"[SENSITIVE_VALUE]"' },
];

/**
 * Applies all filter rules to a single line of text.
 * @param {string} line The line to filter.
 * @returns {string} The filtered line.
 */
function filter(line) {
  let filteredLine = line;
  for (const rule of FILTER_RULES) {
    filteredLine = filteredLine.replace(rule.regex, rule.replacement);
  }
  return filteredLine;
}

/**
 * Manually sets an action output by writing to the GITHUB_OUTPUT file.
 * @param {string} name The name of the output.
 * @param {string} value The value of the output.
 */
function setOutput(name, value) {
  const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
  if (!GITHUB_OUTPUT) {
    throw new Error('GITHUB_OUTPUT environment variable not set');
  }
  // For multiline outputs, we use a heredoc syntax
  const eof = `EOF_${Math.random().toString(36).substring(2)}`;
  appendFileSync(GITHUB_OUTPUT, `${name}<<${eof}\n`);
  appendFileSync(GITHUB_OUTPUT, `${value}\n`);
  appendFileSync(GITHUB_OUTPUT, `${eof}\n`);
}

/**
 * Main function to run the terraform plan.
 */
async function run() {
  try {
    // Get the base path from the environment variable set in action.yml
    const basePath = process.env.INPUT_BASE_PATH || '.';
    const PLAN_FILE = 'redacted_plan.txt';

    // Clear the temp file if it exists
    writeFileSync(PLAN_FILE, '', 'utf-8');

    console.log(`--- Executing Plan in: ${basePath} ---`);

    const command = 'terraform';
    const args = ['plan', '-no-color', '-input=false'];

    const processPromise = new Promise((resolve, reject) => {
      const tfProcess = spawn(command, args, {
        cwd: basePath,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      // Handle stdout and stderr streams
      const handleStream = (stream) => {
        stream.on('data', (data) => {
          const line = data.toString();
          const filteredLine = filter(line);
          // 1. Log to console for real-time output
          process.stdout.write(filteredLine);
          // 2. Append to the temporary file
          appendFileSync(PLAN_FILE, filteredLine, 'utf-8');
        });
      };

      handleStream(tfProcess.stdout);
      handleStream(tfProcess.stderr);

      tfProcess.on('close', (code) => {
        resolve(code ?? 1);
      });

      tfProcess.on('error', (err) => {
        reject(new Error(`Failed to start terraform subprocess: ${err.message}`));
      });
    });

    const exitCode = await processPromise;
    console.log(`--- Plan executed with exit code: ${exitCode} ---`);

    // Read the entire content of the temp file
    const planOutput = require('fs').readFileSync(PLAN_FILE, 'utf-8');

    // Set the action outputs manually
    const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
    if (GITHUB_OUTPUT) {
      appendFileSync(GITHUB_OUTPUT, `exit_code=${exitCode}\n`);
      setOutput('redacted_plan', planOutput);
    }

    // Clean up the temporary file
    rmSync(PLAN_FILE);

  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

run();
