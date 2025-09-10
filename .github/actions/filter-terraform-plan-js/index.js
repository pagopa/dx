#!/usr/bin/env node

const { spawn } = require('child_process');
const { appendFileSync } = require('fs');
const { randomBytes } = require('crypto');

// --- Filter Rules ---
const FILTER_RULES = [
    { regex: /("?hidden-link"?\s*[:=]\s*)".*?"/gi, replacement: '$1"[SENSITIVE_VALUE]"' },
    { regex: /("?APPINSIGHTS_INSTRUMENTATIONKEY"?\s*[:=]\s*)".*?"/gi, replacement: '$1"[SENSITIVE_VALUE]"' },
];

function filter(line) {
    let filteredLine = line;
    for (const rule of FILTER_RULES) {
        filteredLine = filteredLine.replace(rule.regex, rule.replacement);
    }
    return filteredLine;
}

/**
 * Runs terraform plan and returns a promise that resolves with the exit code and full output.
 * This ensures the script waits for the child process to complete.
 */
function runPlan() {
    return new Promise((resolve, reject) => {
        const workingDir = process.env.WORKING_DIRECTORY || '.';
        const command = 'terraform';
        const args = ['plan', '-no-color', '-input=false'];

        const child = spawn(command, args, { cwd: workingDir });

        let bufferedOutput = '';

        // Handle stdout
        child.stdout.on('data', (data) => {
            const filteredLine = filter(data.toString());
            process.stdout.write(filteredLine); // For real-time logging
            bufferedOutput += filteredLine;   // Buffer in memory
        });

        // Handle stderr (also filter and buffer it)
        child.stderr.on('data', (data) => {
            const filteredLine = filter(data.toString());
            process.stderr.write(filteredLine); // For real-time logging
            bufferedOutput += filteredLine;   // Buffer in memory
        });

        child.on('error', (error) => {
            reject(error);
        });

        child.on('close', (code) => {
            // The process has finished, resolve the promise with the results
            resolve({ exitCode: code, plan: bufferedOutput });
        });
    });
}

/**
 * Main async execution block
 */
async function main() {
    try {
        // Await the promise to ensure the script waits for terraform to finish
        const { exitCode, plan } = await runPlan();

        console.log(`\n--- Terraform process finished with exit code: ${exitCode} ---`);

        const githubOutput = process.env.GITHUB_OUTPUT;
        if (!githubOutput) {
            throw new Error('GITHUB_OUTPUT env var not set');
        }

        // Set the exit code output
        appendFileSync(githubOutput, `exit_code=${exitCode}\n`);

        // Set the multiline plan output directly, without a temp file
        const eofMarker = randomBytes(16).toString('hex');
        appendFileSync(githubOutput, `filtered_plan<<${eofMarker}\n`);
        appendFileSync(githubOutput, plan);
        appendFileSync(githubOutput, `\n${eofMarker}\n`);

        // The script itself must exit with 0 so the composite step does not fail.
        // The real result of the plan is communicated via the `exit_code` output.
        process.exit(0);

    } catch (error) {
        console.error("Error running the script:", error);
        process.exit(1);
    }
}

// Start the main execution
main();

