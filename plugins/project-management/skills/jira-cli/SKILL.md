---
name: jira-cli
description: A concise reference for using the Atlassian CLI (acli) to manage Jira issues efficiently. Use this skill to quickly search, edit, and create Jira work items across projects or boards.
---

## Atlassian CLI (acli) Quick Reference

This skill provides a quick reference for common commands and operations related to Jira work items.

Before using the Atlassian CLI (acli), ensure you have it installed and that the user is authenticated and has the necessary permissions to perform the desired operations in Jira.

Install instructions, in case `acli` binary isn't yet installed, can be found in the [Atlassian CLI documentation](https://developer.atlassian.com/cloud/acli/guides/install-linux/).

The term `workitem` is used here to refer to any Jira issue, including tasks, bugs, stories, etc. Any reference to "work item" can be substituted with "issue" or the specific issue type as needed and vice versa.

Start by confirming that the Atlassian CLI is installed and available in the system PATH by running:

```bash
acli --version
```

### List Available Commands

```bash
# List all acli commands
acli --help

# Jira-specific commands
acli jira --help
```

### Verify User Authentication

Run

```bash
acli jira project view --key <PROJECT-KEY>
```

to verify current authentication: `acli auth status` does not work reliably for this purpose.
If not authenticated, point user to [Atlassian CLI Getting Started Guide](https://developer.atlassian.com/cloud/acli/guides/how-to-get-started/).

### Work Item Operations

#### Search for work items

```bash
# Search with JQL query (returns JSON)
acli jira workitem search --jql 'project = CES AND creator = currentUser()' --json

# Search with JQL, limit and specific fields
acli jira workitem search --jql 'project = CES AND status IN (Backlog, "In Progress") AND issuetype IN (Task, Bug) AND description is EMPTY' --fields 'key,summary,status,issuetype' --limit 100 --json

# Count results
acli jira workitem search --jql 'project = CES' --count
```

#### Get work item details

```bash
# Get details by key
acli jira workitem view CES-123 --json
```

#### Edit/Update work items

```bash
# Update a single work item by key
acli jira workitem edit --key CES-1796 --description "Your description" --yes

# Update multiple work items with JQL
acli jira workitem edit --jql 'project = CES' --assignee "user@example.com" --yes

# Update from JSON file
acli jira workitem edit --from-json "workitem.json"

# Generate JSON template for editing
acli jira workitem edit --generate-json
```

#### Create work items

```bash
# Create a new work item
acli jira workitem create --project CES --type Task --summary "Title" --description "Description"

# Bulk create from JSON
acli jira workitem create-bulk --from-json "items.json"
```

### Useful Flags

- `--key`: Specify work item key(s) (e.g., "CES-1796" or "CES-1796,CES-1797")
- `--jql`: Use JQL query to target multiple items
- `--json`: Output results in JSON format
- `--csv`: Output results in CSV format
- `--fields`: Specify comma-separated fields to display (default: issuetype,key,assignee,priority,status,summary)
- `--description`: Set/update description (supports plain text or ADF format)
- `--yes`: Confirm action without prompting (useful for scripts)
- `--limit`: Maximum number of items to fetch
- `--paginate`: Fetch all results by paginating through results

### Tips

- Use `--json` output for parsing with jq (powerful for filtering and transforming results)
- Always use `--yes` flag when scripting to avoid interactive prompts
- JQL queries are powerful: filter by project, creator, status, assignee, etc.
