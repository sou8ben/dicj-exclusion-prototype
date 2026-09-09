# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable workflow decisions

- Leaving an unfinished application or termination flow requires confirmation; cancelling preserves the current form. Guard navigation, logout, demo reset, role changes that leave the flow, and browser unload. Internal steps and successful submission do not prompt.

- Keep the One Account initial-document supplement loop separate from later review returns: `待通知補件 → 已通知補件 → 待處理`, while processor/supervisor returns use `退回 → 待複核` after corrected documents are confirmed.
- Keep the counter workflow's visible status as `待審批`; use an internal stage to distinguish processor review from supervisor approval instead of adding a visible `待複核` status.
- System administrators can operate the full workflow, including counter intake: every status-available action (transition, print, notify, hand over, void) is open to them regardless of the action's designated role.
- Keep a quick demo-role switcher in the right-click context menu (above `重置演示資料`) so each matrix role can be verified without logging out.
- Trigger demo reset from a right-click context menu (`重置演示資料`) on the app shell, not from a visible header button.

## Durable code decisions

- All functions in `src/app.js` use descriptive PascalCase/English names: `statusColor`, `Button`, `Badge`, `Field`, `Select`, `TableEmptyState`, `WizardProgress`, `ProcessTimeline`, `Pager`, `SearchFilters`, `ApplicationsTable`, `DashboardScreen`, `IntakeReadScreen`, `ApplicationFormScreen`, `ApplicationPreviewScreen`, `ApplicationsListScreen`, `ApplicationDetailScreen`, `ReportsScreen`, `SanctionsScreen`, `TemplatesScreen`, `PageHeader`, `SettingsScreen`, `OperationLogsScreen`, `Modal`, `LoginScreen`, `App`. Internal variables use readable names (`isOpen`, `isLoggedIn`, `role`, `applications`, `toast`, `handleHashChange`, `handleGlobalClick`, etc.). Keep these names when adding or modifying functionality.
- Interop globals are declared in `src/vendor.js` (`React`, `jsx`, `StrictMode`) and `src/icons.js` (`ReactDOM`). When adding new code that uses React APIs, use `React.xxx` (e.g. `React.useState`, `React.createElement`), `jsx.jsx`/`jsx.jsxs`/`jsx.Fragment`, `ReactDOM.createRoot`, and `StrictMode.StrictMode`.
- Script load order is `workflow.js → vendor.js → demo-data.js → icons.js → app.js`. Top-level `const`/`var` declarations are shared as globals across files.
- Use `false`/`true`/`undefined` (not `!1`/`!0`/`void 0`).

## Durable visual decisions

- Within `.form-actions`, place all `.btn-danger` buttons at the far left and all `.btn-primary` buttons at the far right, including buttons inside `.button-row`.

- Use a modern government-professional visual language: deep navy identity, interaction blue, cool neutral page surfaces, restrained shadows, and high-contrast semantic status colors.
- Treat 14px as the desktop body-text baseline, 28px for page titles, 18px for section titles, 40px for primary controls, 10px for card radius, and an 8px-based spacing rhythm.
- Design for desktop administration at 1280–1600px, test at 1920×1080 and 1280×800, and keep layouts usable down to 1120px; do not introduce a mobile layout.
- Keep the existing brand, Traditional Chinese content, workflows, data, and routes. Visual work may improve hierarchy and component anatomy but must not change business rules.
- Do not add photography, illustration, gradient backgrounds, dark mode, or new routes. Use the existing Phosphor icon family for navigation and utility icons.
- Keep the role switcher (inside the right-click context menu) compact and clearly select-like: a restrained bordered control, balanced label/caret spacing, and avoid an oversized pill treatment.
- Keep radio controls native, compact, and circular at 18px with the interaction-blue accent; global text-input sizing must never stretch them into pill shapes.
- Checkbox/radio inputs use a custom appearance (18px, brand-700 fill + white check/dot when checked) defined in `src/design-system.css`; their labels get a rounded hover pill. When adding new checkbox/radio markup inside a `.form-grid .field`, remember the base stylesheet's `.form-grid .field input { width: 100% }` rule outranks a plain `input[type="checkbox"]` selector by specificity — the checkbox/radio rule uses `!important` on width/height specifically to stay a fixed 18px regardless of ancestor container.
- The shared custom `<select>` replacement (component `Select`, classes `.select-wrap/.select-btn/.select-text/.select-caret/.dropdown-panel`) is used for every dropdown in the app (login screen, filters, wizard fields, pager, context-menu demo switcher) and is now reskinned in `src/design-system.css` to match text inputs (40px, `--radius-control`, `--border-strong`); `.pager .select-btn` and `.context-menu .select-btn` stay compact overrides. Its caret icon component renders an empty `<svg>` (no path) — the visible arrow is drawn entirely by the `.select-caret` CSS border/rotate trick, not the icon. Do not "clean up" that border thinking it's a redundant double-render; removing it makes every dropdown arrow disappear.
- The `.context-menu`, `.modal`/`.modal-head`/`.modal-body`, `.icon-actions`/`.danger-icon`, `.btn-ghost`, `.helper`, and `.strong` rules in `src/design-system.css` are the unified versions of older base-stylesheet component chrome (modal radius now matches `--radius-card`, icon-action colors use `--brand-700`/`--danger-text`, etc.) — keep new component chrome additions in `src/design-system.css`, not the inline `<style>` block in `index.html`, so everything stays on one token set.

- Flow-exit confirmations inside the app use the shared `Modal`, with 「確認離開」 on the left and 「繼續填寫」 on the right. Do not use `window.confirm`; browser reload/tab-close protection uses the native beforeunload prompt because custom modals cannot block browser unload.
