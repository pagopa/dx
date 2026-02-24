## Nx Release Action - Test Checklist

### Test Scenario 1: Create Release PR from version plans
**Precondition**: No open PR on `changeset-release/main`

**Steps**:
1. Create `.nx/version-plans/feature-name.md` file on main with version plan content (e.g., minor patch for a package)
2. Push to main
3. GitHub workflow runs and creates PR `Version Packages` on `changeset-release/main`

**Expected Results**:
- ✅ PR created with title `chore: Release (Version Packages)`
- ✅ PR body contains release details extracted from CHANGELOG.md
- ✅ Commit contains:
  - Version bumps in `package.json` / `pom.xml`
  - Updated `CHANGELOG.md` files with release notes
  - `.nx/version-plans/**` files **deleted** (consumed)
- ✅ Commit message is `chore: version packages`
- ✅ PR is based on `changeset-release/main` → `main`

---

### Test Scenario 2: Update existing Release PR
**Precondition**: PR already open on `changeset-release/main` from Scenario 1

**Steps**:
1. Create another `.nx/version-plans/another-feature.md` file on main
2. Push to main
3. GitHub workflow runs

**Expected Results**:
- ✅ Existing PR is **updated** (not duplicated)
- ✅ PR now contains version bumps for both features
- ✅ CHANGELOG.md entries for all packages are in the commit
- ✅ All `.nx/version-plans/**` files are deleted
- ✅ No new PR is created

---

### Test Scenario 3: Publish Release after PR merge
**Precondition**: Release PR from Scenario 1 or 2 is merged to main

**Steps**:
1. Merge the PR `Version Packages` to main
2. GitHub workflow runs on the merge commit
3. Workflow detects no more version plans + version bump commits present

**Expected Results**:
- ✅ Workflow detects mode: `publish`
- ✅ `npx nx release publish --yes` is executed
- ✅ Packages are published to npm with:
  - Proper versioning applied
  - Git tags created per package
  - NPM_CONFIG_PROVENANCE=true enabled
- ✅ Output `published=true`

---

### Test Scenario 4: Idempotency - re-run on same commit
**Precondition**: Publish workflow already completed

**Steps**:
1. Manually re-run the workflow job on the same merge commit
2. Workflow detects mode: `publish` again

**Expected Results**:
- ✅ Workflow attempts to run `nx release publish` again
- ✅ Nx handles duplication gracefully (already published packages are skipped or errored out gracefully)
- ✅ No duplicate tags / npm releases

---

### Test Scenario 5: No-op when no plans added
**Precondition**: No version plans pushed to main

**Steps**:
1. Push regular code changes to main
2. GitHub workflow runs

**Expected Results**:
- ✅ Mode detected: `noop`
- ✅ No PR is created
- ✅ No publish is executed
- ✅ Workflow completes cleanly with notice

---

### Test Scenario 6: Coexistence with Changesets
**Precondition**: Repository has `.changeset/config.json` AND `nx.json` present

**Steps**:
1. Push to main with changes
2. Release workflow detects tools

**Expected Results**:
- ✅ Detection step prioritizes **Changesets** over Nx (current behavior maintained)
- ✅ Nx action is **NOT** invoked
- ✅ Changeset flow takes over (backward compatibility)

---

## Manual Local Testing

### Setup version plans locally

```bash
# Create a version plan file
mkdir -p .nx/version-plans
cat > .nx/version-plans/my-feature.md << 'EOF'
---
@pagopa/my-package: minor
---

Add my new feature

EOF

# Run Nx release version --no-commit locally to verify output
npx nx release version --no-commit --dry-run

# Check generated changes (don't commit)
git status
```

### Simulate PR creation logic

```bash
# Check out to a release branch
git checkout -b changeset-release/main

# Run the Nx command
npx nx release version --no-commit --yes

# Verify changes
git diff

# Undo for safety
git reset --hard origin/main
```

---

## Success Criteria

- [ ] All 6 scenarios pass
- [ ] No errors in YAML validation
- [ ] PR body contains proper changelog data
- [ ] Version bumps and changelogs are committed correctly
- [ ] Version plans are consumed (deleted from .nx/version-plans)
- [ ] Idempotency: re-runs don't duplicate PRs or releases
- [ ] Changesets flow is preserved when both tools are present
