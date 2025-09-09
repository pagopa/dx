import sys
import re
import subprocess


# ==============================================================================
#  FILTER RULES LIST
# ==============================================================================
# To add a new rule, add a tuple to this list.
# The format is: (compiled_regex, replacement_string)
#
# - 'compiled_regex': The regex pattern to find the sensitive data.
# - 'replacement_string': The string to replace the found data with.
#
FILTER_RULES = [
    # --- Azure Rules ---
    # Finds "hidden-link" attributes and filter their value.
    (re.compile(r'("?hidden-link"?\s*[:=]\s*)".*?"', re.IGNORECASE), r'\1"[SENSITIVE_VALUE]"'),

    # Finds all possible Instrumentation Key attributes and filter their value.
    (re.compile(r'("?APPINSIGHTS_INSTRUMENTATIONKEY"?\s*[:=]\s*)".*?"', re.IGNORECASE), r'\1"[SENSITIVE_VALUE]"'),

    # --- ADD YOUR AZURE RULES HERE ---

    # --- AWS Rules ---
    # --- ADD YOUR AWS RULES HERE ---

    # --- Generic Rules ---
    # Example: (re.compile(r'("|_|-)password("|_|-) = ".*"', re.IGNORECASE), r'\1password\2 = "[SENSITIVE]"'),
    # --- ADD YOUR GENERIC RULES HERE ---
]

def filter(line):
    """Applies all filter rules to a single line of text."""
    filtered_line = line
    for pattern, replacement in FILTER_RULES:
        filtered_line = pattern.sub(replacement, filtered_line)
    return filtered_line

def run_terraform_plan(output_filename):
    """
    Executes `terraform plan`, prints filtered output to stdout in real-time,
    and saves the same filtered output to the specified file.
    Returns the exit code of the terraform process.
    """
    command = ["terraform", "plan", "-no-color", "-input=false"]

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8'
    )

    try:
        # Open the specified output file for writing
        with open(output_filename, 'w', encoding='utf-8') as f_out:
            if process.stdout:
                for line in process.stdout:
                    filtered_line = filter(line)
                    # 1. Print to stdout for real-time logging in the action UI
                    sys.stdout.write(filtered_line)
                    # 2. Write the same line to the output file
                    f_out.write(filtered_line)
    except IOError as e:
        sys.stderr.write(f"Error: Could not write to file {output_filename}. {e}\n")
        # Still need to wait for the process to finish
        process.wait()
        return 1 # Return a generic error code if file I/O fails

    # Wait for the subprocess to complete and return its exit code
    return process.wait()

if __name__ == "__main__":
    # The script now expects one argument: the name of the file to write to.
    if len(sys.argv) < 2:
        sys.stderr.write("Error: Missing output filename argument.\n")
        sys.stderr.write("Usage: python run_plan.py <output_filename>\n")
        sys.exit(1)

    output_file_path = sys.argv[1]

    # Run the main function and exit with the return code from terraform
    final_exit_code = run_terraform_plan(output_file_path)
    sys.exit(final_exit_code)
