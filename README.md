# Our Home

A frontend-only household chores app, being built in stages. DEV-50 supplies the
working React/TypeScript foundation. DEV-51 adds transactional browser storage,
optional examples, and reviewed backups. The full app shell, chore workflows, and
scheduler are subsequent tasks in [TASKS.md](docs/planning/TASKS.md).

Planning documents and task reports are collected in [docs/planning](docs/planning/).

## Run locally

Use Node **22.22.1** and npm **9.2.0** (also recorded in `.nvmrc` and `package.json`).
With an existing Node version manager, select the project's `.nvmrc` version.
If that Node installation includes a different npm version, run commands through
`npx npm@9.2.0` (for example, `npx npm@9.2.0 ci`) without changing global npm.
The CI workflow selects npm 9.2.0 inside its disposable runner explicitly.

```bash
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally `http://127.0.0.1:5173/`. No
environment file, database, account, Docker, server API, or secret key is needed.
The development server serves frontend files; it is not an application backend.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development with hot reload |
| `npm run build` | Strict type checks and static production output in `dist/` |
| `npm run preview` | Inspect the existing production build locally |
| `npm run lint` | ESLint plus module/storage dependency boundaries |
| `npm run typecheck` | Whole-project checks plus domain compilation without browser/Node globals |
| `npm run test:unit` | Dates, storage contracts, migrations, and architecture tests |
| `npm run test:components` | React navigation, honesty, focus, and recovery tests |
| `npm test` | Both unit and component projects |
| `npm run check` | Lint, tests, type checks, and production build |
| `npm run test:browser` | Desktop/mobile production-build browser tests; build first |

Browser tests normally use Playwright's Chromium:

```bash
npx playwright install chromium
npm run build
npm run test:browser
```

If Chrome is already installed, select its executable instead of downloading a
browser. The local verification used:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:browser
```

The browser test runner starts/stops a static preview on port 4173 itself. Keep
that port free. `.github/workflows/frontend.yml` runs checks and browser tests on
GitHub once a remote is configured and the files are pushed.

## Code boundaries

```text
src/domain/              Pure dates and future scheduling rules
src/application/         Typed commands, validation, and replaceable storage ports
src/adapters/browser/    IndexedDB, temporary memory, and real clock adapters
src/ui/                  React pages, components, and CSS design tokens
src/storage-runtime.ts  Storage composition and explicit temporary-mode selection
src/main.tsx             Application and router setup
scripts/                 Development boundary checks
tests/                   Unit, component, and production-browser verification
```

Domain code cannot depend on React, browser APIs, Node, or data adapters. UI code
cannot read IndexedDB/localStorage/sessionStorage or import adapters directly.
The checker tests static imports, re-exports, type imports, and dynamic imports.
The composition layer injects application operations. The persistent and temporary
adapters share contract tests; components never open the database themselves.

## Routing and hosting

Hash routes (`/#/about`) work on ordinary static hosts without server rewrite
rules. Vite emits relative asset references so the build can also live in a
subdirectory. The `dist/` folder is the deployment artifact; production hosting
is DEV-28. No hosted site or backend was created by this task.

The preview includes Home, About, Local data, a not-found route, and error recovery.
Open **Local data** (`/#/local-data`) to create an empty household, review optional
example data, choose a local profile, and export or restore a JSON backup. Example
loading, restore, and reset require explicit replacement review and confirmation.

Data is saved in IndexedDB for this browser profile and origin. Other browsers,
devices, ports, and hosted origins have separate storage. Profile selection is a
local recording preference, not authentication. When durable storage fails, the
page offers explicit temporary memory; reload loses that temporary data. Backups
are manual, unencrypted snapshots with a 5 MiB limit. Clearing browser data can
remove saved records, so export backups when needed.

Member/chore editing and the scheduling calendar are still future tasks. Example
definitions are saved configuration, not a generated schedule. No messages or
original import files are stored by this foundation.

## Git workflow

The public repository is [fernanda-veiga/household-chores](https://github.com/fernanda-veiga/household-chores).
The local repository uses `main`, with `origin` configured to its GitHub HTTPS URL.
Its project-local author is
`fernanda-veiga <fernandarochaveiga@gmail.com>`; global Git identity is unchanged.
GitHub CLI supplies HTTPS authentication through this project's credential helper;
credentials are not embedded in the remote URL or source files.

For future work, use a feature branch such as `feat/dev-51-local-store`, run the
relevant checks, review the changed files, and make a focused commit. Push a
reviewed branch when pushing is authorized. Frontend checks run on GitHub pushes
and pull requests; inspect their actual status before merging. Avoid committing private
household backups, `.env.local`, auth state, or generated test/build artifacts.

See [DEV50_FRONTEND_SETUP.md](docs/planning/DEV50_FRONTEND_SETUP.md) for implementation decisions,
execution evidence, and the distinction between local verification and hosted CI.

See [DEV51_BROWSER_STORAGE.md](docs/planning/DEV51_BROWSER_STORAGE.md) for the storage implementation, decisions, verification, and limits.
