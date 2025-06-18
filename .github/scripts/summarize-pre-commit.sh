#!/bin/bash

# Display Terraform module lock information if available
if [ -f "lock_output.json" ]; then
  # Use default values with error handling around jq calls
  TOTAL_MODULES=$(jq -r '.summary.total_modules // 0' lock_output.json 2>/dev/null || echo "0")
  EXIT_CODE=$(jq -r '.summary.exit_code // 0' lock_output.json 2>/dev/null || echo "0")

  # Count modules by status with error handling
  NEW_MODULES=0
  CHANGED_MODULES=0
  REMOVED_MODULES=0

  # Safely parse JSON with fallbacks
  if [ "$TOTAL_MODULES" -gt 0 ]; then
    NEW_MODULES=$(jq -r '[.results[]? | select(.status == "new")] | length' lock_output.json 2>/dev/null || echo "0")
    CHANGED_MODULES=$(jq -r '[.results[]? | select(.status == "changed")] | length' lock_output.json 2>/dev/null || echo "0")
    REMOVED_MODULES=$(jq -r '[.results[]? | select(.status == "removed")] | length' lock_output.json 2>/dev/null || echo "0")
    # Warning message when changes detected
    echo "> [!CAUTION]" >> "$GITHUB_STEP_SUMMARY"
    echo "> ### ⚠️ Terraform module changes detected - locks need updating" >> "$GITHUB_STEP_SUMMARY"
    echo ">" >> "$GITHUB_STEP_SUMMARY"
    echo "> ### What should be done next" >> "$GITHUB_STEP_SUMMARY"
    echo ">" >> "$GITHUB_STEP_SUMMARY"
    echo "> 1. Run this command locally to update the module locks:" >> "$GITHUB_STEP_SUMMARY"
    echo ">" >> "$GITHUB_STEP_SUMMARY"
    echo "> \`\`\`bash" >> "$GITHUB_STEP_SUMMARY"
    echo "> pre-commit run -a lock_modules" >> "$GITHUB_STEP_SUMMARY"
    echo "> \`\`\`" >> "$GITHUB_STEP_SUMMARY"
    echo ">" >> "$GITHUB_STEP_SUMMARY"
    echo "> 2. Then open a dedicated Pull Request with the updated module locks" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"

    # Show a detailed summary of module changes
    echo "<details>" >> "$GITHUB_STEP_SUMMARY"
    echo "<summary>📊 What has changed</summary>" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "### Module Stats:" >> "$GITHUB_STEP_SUMMARY"
    echo "- **Total modules**: ${TOTAL_MODULES}" >> "$GITHUB_STEP_SUMMARY"
    echo "- **New modules**: ${NEW_MODULES}" >> "$GITHUB_STEP_SUMMARY"
    echo "- **Changed modules**: ${CHANGED_MODULES}" >> "$GITHUB_STEP_SUMMARY"
    echo "- **Removed modules**: ${REMOVED_MODULES}" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "| Module | Status | Version | Path |" >> "$GITHUB_STEP_SUMMARY"
    echo "|--------|--------|---------|------|" >> "$GITHUB_STEP_SUMMARY"

    # Fix the jq syntax error by using a simpler concatenation approach
    jq -r '.results[] | "| " + .module + " | " + .status + " | " + .version + " | " + (.path // "N/A") + " |"' lock_output.json >> "$GITHUB_STEP_SUMMARY" || {
      echo "Error processing JSON file. Raw content:" >> "$GITHUB_STEP_SUMMARY"
      echo '```json' >> "$GITHUB_STEP_SUMMARY"
      cat lock_output.json >> "$GITHUB_STEP_SUMMARY"
      echo '```' >> "$GITHUB_STEP_SUMMARY"
    }
    echo "</details>" >> "$GITHUB_STEP_SUMMARY"
  else
    # Success message when no changes detected
    echo "> [!TIP]" >> "$GITHUB_STEP_SUMMARY"
    echo "> ### ✅ All Terraform module locks are up to date" >> "$GITHUB_STEP_SUMMARY"
    echo ">" >> "$GITHUB_STEP_SUMMARY"
    echo "> No module changes detected - everything is in sync!" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
  fi
  echo "" >> "$GITHUB_STEP_SUMMARY"
fi

if [ -f "/tmp/pre-commit-output.log" ]; then
  # Create a compact execution context description
  EXECUTION_SCOPE=""
  if [ "$FOLDER" != "" ]; then
    EXECUTION_SCOPE="folder: \`$FOLDER\`"
  elif [ "$EVENT_NAME" == "pull_request" ] && [ "$ENABLE_MODIFIED_FILES_DETECTION" == "true" ]; then
    EXECUTION_SCOPE="modified files"
  else
    EXECUTION_SCOPE="all files"
  fi

  # Add check information
  if [ "$CHECK_TO_RUN" != "" ]; then
    CHECK_INFO="\`$CHECK_TO_RUN\`"
  else
    CHECK_INFO="all checks"
  fi

  # Combine into a single summary line with small text
  echo "<details>" >> "$GITHUB_STEP_SUMMARY"
  echo "<summary>📋 Pre-commit Output Log</summary>" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo '```' >> "$GITHUB_STEP_SUMMARY"
  # Clean up ANSI color codes for better markdown rendering
  cat /tmp/pre-commit-output.log | sed 's/\x1b\[[0-9;]*m//g' >> "$GITHUB_STEP_SUMMARY"
  echo '```' >> "$GITHUB_STEP_SUMMARY"
  echo "</details>" >> "$GITHUB_STEP_SUMMARY"
else
  echo "⚠️ No pre-commit output found. Check if pre-commit was executed." >> "$GITHUB_STEP_SUMMARY"
fi

# Add exit status summary
echo "" >> "$GITHUB_STEP_SUMMARY"
echo "<sub>Generated on $(date)</br>Run $CHECK_INFO on $EXECUTION_SCOPE</sub>" >> "$GITHUB_STEP_SUMMARY"
