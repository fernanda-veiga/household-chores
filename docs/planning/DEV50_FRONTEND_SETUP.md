# DEV-50 — Frontend foundation and Git: results

**Date:** 2026-11-05, America/Recife.  
**Status:** Implemented and locally verified. Hosted CI and publication are not claimed.  
**Scope:** [DEV-50 in the backlog](TASKS.md); frontend-only execution takes precedence over the earlier backend-first architecture.  
**Next work:** DEV-51 local storage/adapter operations, followed by DEV-47's complete application shell.

## 1. What is delivered

A runnable React/TypeScript client application, a static build, browser routing,
responsive design tokens and preview pages, automated tests, enforceable source
boundaries, a GitHub Actions workflow, and a configured local Git repository.

The implementation uses no Supabase CLI, PostgreSQL driver, Docker, authentication
provider, API route, server job processor, or secret key. Downloading npm packages
and serving files during development are tooling steps, not product backends.

The original planning documents remain present. The only existing planning file
updated for this task is TASKS.md, to record completion and the next task. The
earlier architecture/database documents remain inputs for the eventual backend,
not requirements to run this frontend.

## 2. Technical choices and their reasons

### React with TypeScript

React provides reusable interactive UI components. TypeScript checks the data
contracts before code runs. Strict null/optional/indexed-access checking is
enabled so missing data is handled deliberately rather than hidden by permissive
types. React and React DOM use matching pinned versions.

This task provides the host and a few pages; it does not introduce another UI
framework, a global state library, or an invented household database. Local state
and persistence requirements are developed behind the adapter boundary in DEV-51.

### Vite instead of the previously proposed server-oriented host

Vite is the frontend development/build tool. It produces HTML, CSS, and JavaScript
under `dist/`, which can be served as static files. This directly supports the
new frontend-first scope. Its development server handles asset delivery and hot
reload; it does not store chores or implement application APIs. The selected
Node version meets the tool's runtime requirements. [Vite documentation](https://vite.dev/guide/).

There is no need to deploy a server framework merely to inspect the frontend.
When backend work begins, typed application operations can be connected to a
remote implementation; the UI and pure rules should remain reusable.

### Hash-based client routing

React Router handles Home, About, and unknown-page recovery entirely in the
browser. URLs use a fragment, for example `/#/about`. Fragments do not require a
static host to interpret application routes or supply a fallback rewrite.

The tradeoff is a visible `#` in route URLs. This favors portable static hosting
over cleaner path URLs at this stage. Navigation, refresh, Back, active links,
page titles, and heading focus are covered by tests. Relative build asset paths
also allow hosting below a subdirectory. Later routing changes should preserve
links deliberately rather than requiring an incidental backend dependency.

### Plain CSS and reusable tokens

`src/ui/tokens.css` contains color/font tokens. `styles.css` applies the warm
neutral/green direction from UX_DESIGN.md using responsive grids and ordinary CSS.
System fonts avoid remote font requests; the house illustration and favicon are
local SVG assets and need no image service or third-party CDN.

No CSS framework is needed for this bounded foundation. Tokens make later shared
components consistent without adding a dependency merely for a small stylesheet.
The full desktop/mobile product shell remains DEV-47, not an implied finished
feature of this preview.

### Honest preview and accessibility

The page labels itself as an early frontend preview and states that setup,
scheduling, and saving are coming next. About explains the future local-data
scope, later shared access, and manual-only message handoff. No fake account,
completion checkbox, saved household, or successful invitation is presented.

The implementation includes semantic headings/landmarks, active-link indication,
visible focus, a keyboard skip link, focus movement after route changes, a 360px
mobile layout, reduced-motion treatment, unknown-route recovery, and an error
boundary with a reload action. Automated accessibility results are evidence for
these pages, not a claim of a full human accessibility audit or assistive-device
certification.

### Enforced module boundaries

| Layer | Responsibility now and later |
| --- | --- |
| Domain | Pure calendar-date validation now; recurrence/capacity rules later |
| Application | Reserved boundary for operations/ports introduced in DEV-51 |
| Browser adapters | Reserved boundary for persistence introduced in DEV-51 |
| UI | React pages/components, presentation, navigation |
| Composition root | Connects router/React now; supplies adapters/operations later |

A TypeScript-AST checker validates imports, re-exports, type imports, dynamic
imports, and direct storage access. Domain code cannot depend on React, Node,
browser APIs, another layer, or implicit runtime time/randomness. Application
code cannot depend on infrastructure/UI packages. UI cannot import browser
adapters or touch storage directly. A second TypeScript configuration compiles
the domain without browser or Node global types.

Tests include forbidden imports and storage calls so these checks are executable
guardrails, not just folder names. They are development architecture checks, not
a browser security sandbox; backend authorization is future work.

### A small pure date example

`calendar-date.ts` validates unambiguous YYYY-MM-DD values and real calendar
days, including leap-year rules, without converting through the device timezone.
It supplies a useful tested example of pure domain code. It does not implement
recurrence, a system clock, missed-day reconciliation, or scheduling. Those stay
in their backlog tasks.

### Pinned toolchain and reproducible installation

Node 22.22.1 and npm 9.2.0 are recorded in `.nvmrc`, package engines, and the npm
package-manager field. All direct dependencies have exact versions and a single
`package-lock.json`; `.npmrc` enforces engines and exact saves. `npm ci` installs
the locked tree, which was verified after initial dependency installation.
CI explicitly selects the pinned npm version after selecting Node, because a
Node installation can include a different bundled npm. Local setup documents a
versioned npm invocation that does not require changing global npm.

TypeScript 5.9.3 was selected within typescript-eslint's supported peer range,
rather than choosing a newer incompatible compiler solely because it exists.
Vite, Vitest, Playwright, React/testing-library, ESLint, and jsdom versions were
resolved and then validated together through the actual checks/build.

The dependency audit identified a transitive glob-matcher advisory in lint
tooling. `minimatch` is overridden to patched 11.0.4, followed by lint/tests and
a clean installation. The final install/audit reports zero known vulnerabilities
at verification time. This is a dated tool report, not a permanent guarantee.

## 3. Tests and build workflow

| Check | Actual result |
| --- | --- |
| Clean installation from lockfile | `npm ci` completed successfully |
| Lint and AST module boundaries | Passed |
| Project and domain-only type checks | Passed |
| Unit tests | 33 passed: date validation and architecture boundaries |
| React component tests | 4 passed: truthful preview, navigation/focus, unknown route, error recovery |
| Static production build | Passed; output under `dist/` |
| Production-build browser tests | 6 passed: three scenarios on desktop and mobile Chromium |
| Dependency audit | Zero known vulnerabilities reported on the final dependency tree |
| Local development HTTP response | HTTP 200 verified |
| Hosted GitHub Actions | Workflow configured; not run because no remote/push exists |

The browser run used the existing `/usr/bin/google-chrome`, selected through
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The configuration otherwise uses
Playwright's installed Chromium; CI installs that browser itself. Tested
viewports were 1440×1000 and 360×800. This is not Firefox, Safari, physical-phone,
or broad cross-browser validation.

The browser tests serve the actual `dist/` build on port 4173 and verify:

- Both navigation directions, refresh of a hash route, and active heading focus.
- No application requests outside the local static origin and no page errors.
- Axe checks on Home, About, and unknown-route pages, with no violations reported.
- No horizontal overflow at both viewport sizes.
- Keyboard skipping of navigation and recovery from an unknown route.

Vitest runs real unit/component suites with no empty-suite pass setting.
Playwright is a separate command because it requires a browser and a built
artifact. [Vitest documentation](https://vitest.dev/guide/), [Playwright documentation](https://playwright.dev/docs/intro).

The attempted visible in-app preview was declined by the browser approval gate.
It was not retried through another surface. The headless production-build tests
had been launched before that denial and completed successfully; their results
are reported separately. The owned development server was stopped after checks.

## 4. Git configuration and workflow

Initial inspection found no usable repository. A new local repository was
initialized with `main`, preserving the six original Markdown documents. The
project-local author settings use the previously supplied identity:

- Name: fernanda-veiga.
- Email: fernandarochaveiga@gmail.com.
- Line-ending behavior: incoming text normalized with project-local
  `core.autocrlf=input` plus explicit `.gitattributes` LF rules.
- Remote housekeeping: project-local `fetch.prune=true`.

Global Git configuration was not changed. No initial commit, hosted repository,
remote URL, or push was invented. All source/doc files remain available for the
first reviewed commit; the lack of a commit does not mean a prior history was
overwritten. There was no existing usable history at initialization.

Verified ignored examples include `.env.local`, dependencies, `dist/`, private
`local-data/`, test traces, and browser auth state. Verified source/example files
remain trackable. Attribute checks confirm LF text policy for source, JSON, and
workflow files.

The next Git steps are to supply the repository URL, configure `origin`, review
the initial files, make a deliberate initial commit, and push an authorized
branch. Subsequent feature branches should run relevant checks before a PR;
the included CI workflow becomes executable after push to a GitHub repository.

## 5. Running and reviewing the result

See [README.md](../../README.md) for all commands. The minimal workflow is:

```bash
npm ci
npm run dev
```

For the production artifact:

```bash
npm run build
npm run preview
```

No environment file is required. `.env.example` only explains that frontend
environment variables are public, not a location for future secret keys.
Production hosting belongs to DEV-28; this task does not publish the website.

## 6. Acceptance coverage and remaining scope

| DEV-50 criterion | Evidence |
| --- | --- |
| React/TypeScript, static build, routing, tokens, pinned tooling | Application/config files, successful build and production-browser tests |
| No backend prerequisites | No backend packages/services/configuration; no external data requests in browser tests |
| Working checks and CI configuration | Test results above and `.github/workflows/frontend.yml` |
| Domain/UI/application/browser adapter boundaries | Folder contracts, AST checker, domain-only TypeScript check, negative tests |
| Git identity/branch/history-safe setup | New `main` repository with only local settings and original documents preserved |
| Ignore/line-ending policy | `git check-ignore` and `git check-attr` checks |
| Origin only when supplied | No remote configured; external setup explicitly recorded |
| Clean install and accessible static preview | Lockfile replay, 37 unit/component tests, 6 desktop/mobile browser tests |

Not implemented here: household storage, transactions, example dataset, chore CRUD,
real calendar/checklists, scheduling, import, message composition, authentication,
backend services, or production publication. These are explicit subsequent tasks,
not hidden requirements to run this foundation. DEV-51 is the next implementation
step and DEV-47 builds the full application shell after local data operations exist.
