# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable workflow decisions

- Leaving an unfinished application or termination flow requires confirmation only when the flow data has changed (`flowDirty` is set by intake/form edits via the screens' `onDirty` callback and cleared on flow entry, successful submission, logout, role changes, and demo reset); cancelling preserves the current form. Guard navigation, logout, demo reset, role changes that leave the flow, and browser unload. Internal steps, successful submission, and leaving an untouched flow do not prompt.

- Keep the One Account initial-document supplement loop separate from later review returns: `待通知補件 → 已通知補件 → 待處理`, while processor/supervisor returns use `退回 → 待複核` after corrected documents are confirmed.
- Keep the counter workflow's visible status as `待審批`; use an internal stage to distinguish processor review from supervisor approval instead of adding a visible `待複核` status.
- RecordCheck 核查禁入紀錄時以「證件類型:證件號碼」為鍵查詢 `DemoData.exclusionHistory`（demo 紀錄均為澳門居民身份證），兩者須同時相符；介面顯示「證件類型：…　證件號碼：…」。續期判定（到期前 30 天內）以本機時間為準，demo 13888888 的到期日為本機日期 + 20 天。
- 公眾假期資料以「名稱+日期」去重、依日期排序；跨日假期日期存為「開始日 至 結束日」，編輯時僅改開始日（改到 ≥ 結束日則收斂為單日），儲存需有日期且不可與其他列重複。
- System administrators can operate the full workflow, including counter intake: every status-available action (transition, print, notify, hand over, void) is open to them regardless of the action's designated role.
- Keep a quick demo-role switcher in the right-click context menu (above `重置演示資料`) so each matrix role can be verified without logging out.
- The context menu's demo fill offers three RecordCheck scenarios driven by `fillScenario` + `fillKey`: `30天可續期`（澳門居民身份證 13888888）、`未到期`（88888888，2027-09-01 到期）、`新申請`（12345670，無紀錄）；profiles 定義於 `demo-data.js` 的 `DemoFillProfiles`。
- Trigger demo reset from a right-click context menu (`重置演示資料`) on the app shell, not from a visible header button.
- Application-form drafts (暫存) live in `localStorage` under keys built from the applicant's document type + document number (`dicj:draft:{證件類型}:{證件號碼}`); the form auto-saves a versioned snapshot (debounced, skipping empty forms and demo-fill sessions), the leave-flow confirmation button 「確認離開並暫存」 and browser unload flush the current form state to the draft before leaving, entry prompts 「恢復暫存草稿 / 重新填寫」 when a draft exists, and the draft is deleted on successful submission and re-seeded by `重置演示資料`. The demo seed is 澳門居民身份證 12345678. The 工作台 dashboard shows a 「暫存草稿」 records panel (證件類型 / 證件號碼 / 申請類型 / 暫存時間 / 繼續、刪除) above the 待辦申請 queue, read from `localStorage` via `listDrafts()`; 「繼續」直接進入草稿對應的申請／廢止流程、回到原步驟並立即帶出資料，不再重走證件核查或顯示恢復確認。
- 處理審批申請 is merged into 工作台 (dashboard): there is no separate approvals sidebar item or screen — the dashboard shows the full actionable queue (待辦申請) with 查看處理 actions, the actionable-count badge sits on 工作台, and `#approvals` renders the dashboard.
- 一戶通案件在「已審批」階段不顯示「列印已簽文件」動作；可直接發送取件通知。親臨案件的「列印通知書／公函」動作維持不變。
- 案件詳情的「申請概況」不顯示「目前階段」欄位；內部 `stage` 仍保留供工作流程判定使用。
- 案件詳情的「申請人資料」與「期限、通知與聲明」共用同一個 panel，後者以帶分隔線的 subsection 呈現。
- 案件詳情的「申請人資料」標題右側顯示「編輯」按鈕（櫃枱人員或系統管理員於可修正狀態使用）；點擊後在原 panel 內編輯並可儲存或取消，儲存需填寫姓名、證件類型及證件號碼，更新同步回案件清單。

## Durable code decisions

- Group `FRONTEND_CHANGELOG` entries by update date. Put the newest dated section first using the title format `YYYY.MM.DD 更新內容`, and place new change items under that date instead of mixing them into older feature-category sections.
- All functions in `src/app.js` use descriptive PascalCase/English names: `statusColor`, `Button`, `Badge`, `Field`, `Select`, `TableEmptyState`, `WizardProgress`, `ProcessTimeline`, `Pager`, `SearchFilters`, `ApplicationsTable`, `DashboardScreen`, `IntakeReadScreen`, `ApplicationFormScreen`, `ApplicationPreviewScreen`, `ApplicationsListScreen`, `ApplicationDetailScreen`, `ReportsScreen`, `SanctionsScreen`, `TemplatesScreen`, `PageHeader`, `SettingsScreen`, `OperationLogsScreen`, `Modal`, `LoginScreen`, `App`. Internal variables use readable names (`isOpen`, `isLoggedIn`, `role`, `applications`, `toast`, `handleHashChange`, `handleGlobalClick`, etc.). Keep these names when adding or modifying functionality.
- Interop globals are declared in `src/vendor.js` (`React`, `jsx`, `StrictMode`) and `src/icons.js` (`ReactDOM`). When adding new code that uses React APIs, use `React.xxx` (e.g. `React.useState`, `React.createElement`), `jsx.jsx`/`jsx.jsxs`/`jsx.Fragment`, `ReactDOM.createRoot`, and `StrictMode.StrictMode`.
- Script load order is `workflow.js → vendor.js → demo-data.js → icons.js → app.js`. Top-level `const`/`var` declarations are shared as globals across files.
- Use `false`/`true`/`undefined` (not `!1`/`!0`/`void 0`).
- Never call `jsx.jsx(Icon)` without the empty props object — always `jsx.jsx(Icon, {})`. The production react-jsx-runtime reads `props.key` unconditionally, so a missing props object throws `Cannot read properties of undefined (reading 'key')` and unmounts the whole app into a blank page.

## Durable visual decisions

- Within `.form-actions`, place all `.btn-danger` buttons at the far left and all `.btn-primary` buttons at the far right, including buttons inside `.button-row`.
- Table action-column headers, cells, and button groups stay right-aligned, including the hovered-row state.

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
