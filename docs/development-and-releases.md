# Development Workflow, Branching & Automated Releases

This guide documents the Git branching model, commit conventions, semantic versioning rules, and CI/CD pipelines for **Jack Ten Poker**.

---

## 1. Git Branching Model

```text
feat/* | fix/* | chore/* | docs/*
              │
              ▼ (PR / merge)
          develop  ────────────────► Auto-deploys DEV to GitHub Pages
              │
              ▼ (Promote tested release via PR / merge)
           main    ────────────────► Semantic Release (v1.x.x) + Auto-deploy PROD to Appwrite Sites
              │
              └────────────────────► Release commit (package.json + CHANGELOG.md) synced back to develop
```

- **`develop` (Primary Integration Branch / `origin/HEAD`)**:
  - All day-to-day feature work, bug fixes, refactors, and documentation updates target `develop`.
  - Use short-lived branches created from `develop` with descriptive prefixes: `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `chore/<topic>`, `docs/<topic>`.
- **`main` (Production Release Branch)**:
  - Represents live production. Never commit day-to-day work directly to `main`; promote verified changes from `develop` to `main`.
  - After each automated release, `.github/workflows/release.yml` merges the release metadata commit (`package.json` + `CHANGELOG.md`) back into `develop`.

---

## 2. Atomic Commit Discipline

Keep Git history clean, bisect-friendly, and easy to review:

- **One logical change per commit**: Never bundle unrelated features, bug fixes, refactors, and documentation updates into a single giant commit.
- **Split thoughtfully**: Separate core domain/service fixes, UI changes, and documentation/tooling updates into distinct commits whenever they represent separate concerns.
- **Every commit must build cleanly**: Avoid broken intermediate commits.
- **Stage selectively**: Use `git add <specific-files>` or `git add -p` and inspect `git diff --cached` before committing so unrelated whitespace or local editor changes are never swept in.

---

## 3. Conventional Commits Policy

Every commit message and pull request title MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<optional-scope>)[!]: <short imperative description>

[optional body explaining why]

[optional footer(s), e.g. BREAKING CHANGE: ...]
```

### Allowed Types
| Type | Purpose | SemVer Bump on `main` |
| :--- | :--- | :---: |
| `feat` | New user-facing feature | **Minor** (`v1.X.0`) |
| `fix` | Bug fix | **Patch** (`v1.x.X`) |
| `perf` | Performance improvement | **Patch** (`v1.x.X`) |
| `refactor` | Code restructuring without behavior change | **Patch** (`v1.x.X`) |
| `revert` | Revert a prior commit | **Patch** (`v1.x.X`) |
| `feat!` / `fix!` / `BREAKING CHANGE:` | Breaking API or schema change | **Major** (`vX.0.0`) |
| `docs` | Documentation updates (`README.md`, `docs/`, `AGENTS.md`) | None |
| `style` | Formatting / lint-only changes | None |
| `test` | Test additions or updates | None |
| `build` | Build system or dependency changes | None |
| `ci` | GitHub Actions / pipeline updates | None |
| `chore` | Maintenance and repo hygiene | None |

### Enforcement
- **Local Git Hook**: Run `npm run hooks:install` once per clone to enable `.githooks/commit-msg` (powered by `scripts/validateCommitMsg.mjs`).
- **CI Validation**: `.github/workflows/ci.yml` validates every pushed commit and pull request title automatically.

---

## 4. Local Validation Checklist

Before pushing or opening a pull request, run:

```bash
npm run build        # TypeScript check (tsc -b) + Vite production build
npm run lint         # Oxlint check
npm run bundle:site  # Verify Appwrite Sites deployment tarball builds cleanly
```

---

## 5. CI/CD Pipelines & Environment Configuration

### CI Workflow (`.github/workflows/ci.yml`)
Runs on every push and pull request targeting `develop` or `main`:
- Validates Conventional Commit messages and PR titles
- Runs `npm run lint`
- Validates `public/sw.js` syntax and verifies all icons referenced by `public/manifest.webmanifest`
- Runs `npm run bundle:site` and verifies PWA assets exist in `dist/`
- Uploads `holdem-site.tar.gz` as a build artifact

### DEV Deployment — GitHub Pages (`.github/workflows/deploy-dev.yml`)
Runs automatically on every push to `develop` (or manually via `workflow_dispatch`):
- Builds the SPA with `VITE_BASE_PATH=/holdem/` (configurable via `vars.PAGES_BASE_PATH`)
- Generates `dist/404.html` and `dist/.nojekyll` so client-side deep links work seamlessly on GitHub Pages
- Deploys to the `github-pages` environment

**Optional GitHub Repository Variables for DEV:**
- `DEV_VITE_APPWRITE_ENDPOINT` (or `VITE_APPWRITE_ENDPOINT`)
- `DEV_VITE_APPWRITE_PROJECT_ID` (or `VITE_APPWRITE_PROJECT_ID`)
- `DEV_VITE_APPWRITE_DATABASE_ID` (or `VITE_APPWRITE_DATABASE_ID`)
- `DEV_VITE_APPWRITE_VENUE_BUCKET_ID` (or `VITE_APPWRITE_VENUE_BUCKET_ID`)
- `PAGES_BASE_PATH` (defaults to `/<repo-name>/`)

### PROD Release & Deployment — Appwrite Sites (`.github/workflows/release.yml`)
Runs automatically when `develop` is merged/pushed into `main`:
1. Verifies lint, production build (`VITE_BASE_PATH=/`), and packages `holdem-site.tar.gz`.
2. Runs `semantic-release` (configured in `.releaserc.json`) to:
   - Compute the next `v1.x.x` tag from commits since the last tag
   - Update `package.json` and `CHANGELOG.md`
   - Publish GitHub Release Notes attaching `holdem-site.tar.gz`
3. Syncs the release commit back into `develop`.
4. Runs `node scripts/deployAppwriteSite.mjs` to upload and activate `holdem-site.tar.gz` on Appwrite Sites.

**Required GitHub Secrets / Variables for PROD:**
- `secrets.APPWRITE_API_KEY` — Appwrite API key with Sites deployment permissions
- `vars.APPWRITE_SITE_ID` (or `secrets.APPWRITE_SITE_ID`) — Target Appwrite Site ID
- Optional `vars.VITE_APPWRITE_ENDPOINT`, `vars.VITE_APPWRITE_PROJECT_ID`, `vars.VITE_APPWRITE_DATABASE_ID`, `vars.VITE_APPWRITE_VENUE_BUCKET_ID`
