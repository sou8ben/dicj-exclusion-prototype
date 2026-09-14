/* ================================================================
 * App UI（共用元件 Components + 畫面 Screens + 主應用程式 + 進入點）
 * 載入順序：workflow.js → vendor.js → demo-data.js → icons.js → 本檔
 * ================================================================ */

/* ----------------------------------------------------------------
 * 導航配置 Navigation（側邊欄主選單，配合 7.4 的畫面切換）
 * ---------------------------------------------------------------- */
const NAV_ITEMS = [
  { label: "工作台", id: "dashboard", icon: z0 },
  {
    label: "臨櫃收件",
    id: "intake",
    icon: Md,
    children: [
      { label: "申請", id: "intake" },
      { label: "廢止", id: "terminate" },
    ],
  },
  { label: "申請管理", id: "applications", icon: W8 },
  { label: "報表及查詢", id: "reports", icon: Na },
  { label: "行政處罰名單", id: "sanctions", icon: rf },
  { label: "內容模板管理", id: "templates", icon: T0 },
  { label: "公眾假期管理", id: "holidays", icon: Kc },
  { label: "字典配置", id: "dictionary", icon: W8 },
  { label: "角色權限管理", id: "roles", icon: V0 },
  { label: "帳號管理", id: "accounts", icon: rf },
  { label: "操作日誌", id: "logs", icon: W8 },
];

/* ---- 7.2 工具函數 Utils ---- */
const statusColor = (status) =>
  status.includes("完成") ||
  status.includes("已審批") ||
  status.includes("生效") ||
  status === "啟用" ||
  status === "成功"
    ? "green"
    : status.includes("退回") || status.includes("作廢") || status.includes("不通過")
      ? "red"
      : status.includes("待") || status === "部分成功"
        ? "amber"
        : "blue";
/* ---- ICS 解析：抽取 VEVENT 事件為公眾假期資料 ---- */
const formatNow = () => {
  const now = new Date(),
    pad = (num) => String(num).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};
/* ---- 暫存草稿 Draft Storage：以「證件類型 + 證件號碼」為 key 核心 ---- */
const buildDraftKey = (docType, docNo) => `${DraftKeyPrefix}${docType}:${docNo}`;
const saveDraft = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* 私密模式或容量不足時靜默忽略 */
  }
};
const loadDraft = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed && parsed.v === 1 ? parsed : null;
  } catch (error) {
    return null;
  }
};
const removeDraft = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    /* 同上 */
  }
};
const clearAllDrafts = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(DraftKeyPrefix))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    /* 同上 */
  }
};
const seedDemoDrafts = () => Object.entries(DemoDrafts).forEach(([key, value]) => saveDraft(key, value));
const parseDraftKey = (key) => {
  const rest = key.startsWith(DraftKeyPrefix) ? key.slice(DraftKeyPrefix.length) : key,
    separator = rest.indexOf(":");
  return separator === -1 ? { docType: rest, docNo: "" } : { docType: rest.slice(0, separator), docNo: rest.slice(separator + 1) };
};
const draftTypeLabel = (draft) => (draft.mode === "terminate" ? "廢止" : draft.appType === "續期" ? "續期" : "申請");
const listDrafts = () => {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(DraftKeyPrefix))
      .map((key) => {
        const { docType, docNo } = parseDraftKey(key);
        return { key: key, docType: docType, docNo: docNo, draft: loadDraft(key) || {} };
      })
      .sort((left, right) => String(right.draft.savedAt || "").localeCompare(String(left.draft.savedAt || "")));
  } catch (error) {
    return [];
  }
};
const parseICS = (content) => {
  const unfolded = String(content)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n[ \t]/g, ""),
    toDate = (raw) => `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
    unescapeText = (text) =>
      text
        .replace(/\\n/g, " ")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\")
        .trim(),
    created = formatNow(),
    events = [],
    blockPattern = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;
  while ((match = blockPattern.exec(unfolded))) {
    const block = match[1],
      startMatch = /^DTSTART(?:;[^:]*)?:(\d{8})/m.exec(block);
    if (!startMatch) continue;
    const endMatch = /^DTEND(?:;[^:]*)?:(\d{8})/m.exec(block),
      summaryMatch = /^SUMMARY(?:;[^:]*)?:(.*)$/m.exec(block),
      startDate = toDate(startMatch[1]),
      endDate = endMatch && endMatch[1] !== startMatch[1] ? toDate(endMatch[1]) : "",
      isMultiDay = endDate
        ? new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`) > 86400000
        : false;
    events.push({
      name: (summaryMatch && unescapeText(summaryMatch[1])) || "未命名假期",
      date: isMultiDay ? `${startDate} 至 ${endDate}` : startDate,
      created: created,
    });
  }
  return events;
};
/* ---- 7.3 共用元件 Components（按鈕、徽章、欄位、選單等）---- */
function Button({
  children: children,
  variant: variant = "primary",
  icon: icon,
  onClick: onClick,
  type: type = "button",
  disabled: disabled = false,
}) {
  return jsx.jsxs("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    className: `btn btn-${variant}`,
    children: [icon && jsx.jsx(icon, { size: 17, weight: "bold" }), children],
  });
}
function Badge({ children: children }) {
  return jsx.jsx("span", {
    className: `status status-${statusColor(String(children))}`,
    children: children,
  });
}
const containsSelect = (node) => {
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some(containsSelect);
  if (node.type === Select) return true;
  const kids = node.props && node.props.children;
  return kids ? (Array.isArray(kids) ? kids : [kids]).some(containsSelect) : false;
};
function Field({ label: label, required: required, children: children, wide: wide }) {
  const className = wide ? "field wide" : "field",
    content = [
      jsx.jsxs("span", { children: [label, required && jsx.jsx("b", { children: "*" })] }),
      children,
    ];
  // 自訂 Select 非原生表單控件，label 會把空白處點擊轉發到其按鈕而意外展開選單，改用 div 包裝
  return containsSelect(children)
    ? jsx.jsxs("div", { className: className, children: content })
    : jsx.jsxs("label", { className: className, children: content });
}
function Select({ children: children, value: value, onChange: onChange, className: className = "" }) {
  const [isOpen, setIsOpen] = React.useState(false),
    [localValue, setLocalValue] = React.useState(value),
    wrapRef = React.useRef(null),
    options = (Array.isArray(children) ? children : [children]).map((opt) => ({
      value: opt.props.value ?? opt.props.children,
      label: opt.props.children,
    })),
    current = options.find((opt) => opt.value === (onChange ? value : localValue)) || (onChange && !value ? null : options[0]);
  React.useEffect(() => {
    if (!isOpen) return;
    const opt = (event) => {
        event.target && !wrapRef.current.contains(event.target) && setIsOpen(false);
      },
      handleEscape = (event) => event.key === "Escape" && setIsOpen(false);
    return (
      window.addEventListener("click", opt),
      window.addEventListener("keydown", handleEscape),
      () => (
        window.removeEventListener("click", opt),
        window.removeEventListener("keydown", handleEscape)
      )
    );
  }, [isOpen]);
  return jsx.jsxs("div", {
    ref: wrapRef,
    className: "select-wrap" + (className ? ` ${className}` : ""),
    children: [
      jsx.jsxs("button", {
        type: "button",
        className: "select-btn" + (isOpen ? " open" : ""),
        onClick: () => setIsOpen(!isOpen),
        children: [
          jsx.jsx("span", { className: "select-text", children: current ? current.label : "" }),
          jsx.jsx(Ad, { className: "select-caret", size: 14, weight: "bold" }),
        ],
      }),
      isOpen &&
        jsx.jsx("div", {
          className: "dropdown-panel",
          children: options.map((opt) =>
            jsx.jsx(
              "button",
              {
                type: "button",
                className: opt.value === (onChange ? value : localValue) ? "selected" : "",
                onClick: () => {
                  (onChange ? onChange({ target: { value: opt.value } }) : setLocalValue(opt.value), setIsOpen(false));
                },
                children: opt.label,
              },
              opt.value,
            ),
          ),
        }),
    ],
  });
}
function TableEmptyState({ cols: cols }) {
  return jsx.jsx("tr", {
    className: "empty-state",
    children: jsx.jsx("td", {
      colSpan: cols,
      children: jsx.jsxs("div", {
        children: [
          jsx.jsx("strong", { children: "目前沒有符合條件的案件" }),
          jsx.jsx("span", { children: "調整篩選條件後再試一次。" }),
        ],
      }),
    }),
  });
}

/* ---- 可點擊排序的表頭（table-wrap 通用）---- */
function compareSortValues(a, b) {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "zh-Hant", { numeric: true });
}
function toggleSortKey(sort, key) {
  return sort.key === key
    ? { key: key, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { key: key, direction: "asc" };
}
function sortRowsForDisplay(rows, sort, accessors) {
  const accessor = sort && sort.key && accessors[sort.key];
  if (!accessor) return rows;
  const factor = sort.direction === "desc" ? -1 : 1;
  return rows
    .map((row, index) => ({ row: row, index: index }))
    .sort((a, b) => {
      const result = compareSortValues(accessor(a.row), accessor(b.row));
      return result !== 0 ? result * factor : a.index - b.index;
    })
    .map((entry) => entry.row);
}
function SortableTh({ label: label, sortKey: sortKey, sort: sort, onSort: onSort }) {
  const active = sort.key === sortKey;
  return jsx.jsx("th", {
    className: "th-sortable" + (active ? " is-active" : ""),
    onClick: () => onSort(toggleSortKey(sort, sortKey)),
    children: jsx.jsxs("span", {
      className: "th-sort-label",
      children: [
        label,
        jsx.jsx("span", {
          className: "sort-icon",
          "aria-hidden": "true",
          children: active ? (sort.direction === "asc" ? "▲" : "▼") : "⇅",
        }),
      ],
    }),
  });
}

const WizardSteps = {
  // 非廢止流程在選擇申請方式前尚不知為本人或親屬，先用最短的本人流程顯示
  intake: ["身份驗證", "核查紀錄", "選擇申請方式", "填寫申請資料", "確認並提交"],
  relative: [
    "身份驗證",
    "核查紀錄",
    "選擇申請方式",
    "填寫申請資料",
    "填寫親屬證件資料",
    "填寫親屬資料",
    "確認並提交",
  ],
  terminate: ["身份驗證", "核查紀錄", "填寫廢止資料", "確認並提交"],
};

function WizardProgress({ current: current, steps: steps }) {
  const stepLabels = steps || ["身份驗證", "核查紀錄", "填寫申請資料", "確認並提交"];
  return jsx.jsx("ol", {
    className: "wizard-progress",
    "aria-label": "申請進度",
    children: stepLabels.map((stepLabel, stepIndex) => {
      const stepNumber = stepIndex + 1;
      return jsx.jsxs(
        "li",
        {
          className: stepNumber < current ? "done" : stepNumber === current ? "current" : "",
          "aria-current": stepNumber === current ? "step" : undefined,
          children: [jsx.jsx("b", { children: stepNumber }), jsx.jsx("span", { children: stepLabel })],
        },
        stepLabel,
      );
    }),
  });
}

function ProcessTimeline({ application: application }) {
  const stepLabels = application.source === "一戶通"
      ? ["待處理", "補件處理", "待複核", "待審批", "已審批", "通知取件", "完成"]
      : ["待處理", "待審批", "已審批", "完成"],
    stepIndexByStatus = application.source === "一戶通"
      ? {
          待處理: 0,
          待通知補件: 1,
          已通知補件: 1,
          退回: 1,
          待複核: 2,
          待審批: 3,
          已審批: 4,
          已通知取件: 5,
          完成: 6,
        }
      : { 待處理: 0, 待審批: 1, 已審批: 2, 完成: 3, 作廢: 3 },
    currentStepIndex = stepIndexByStatus[application.status] ?? 0,
    isCancelled = application.status === "作廢";
  return jsx.jsxs("div", {
    className: "process-block",
    children: [
      jsx.jsxs("div", {
        className: "process-block-head",
        children: [
          jsx.jsx("b", { children: "案件流程" })
        ],
      }),
      jsx.jsx("ol", {
        className: `process-progress${isCancelled ? " cancelled" : ""}`,
        "aria-label": "案件流程進度",
        children: stepLabels.map((label, stepIndex) =>
          jsx.jsx(
            "li",
            {
              className: stepIndex < currentStepIndex ? "done" : stepIndex === currentStepIndex ? "current" : "",
              "aria-current": stepIndex === currentStepIndex ? "step" : undefined,
              children: isCancelled && stepIndex === currentStepIndex ? "作廢" : label,
            },
            label,
          ),
        ),
      }),
    ],
  });
}
function buildPagerPageList(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, 2, totalPages - 1, totalPages, current - 1, current, current + 1]),
    sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b),
    list = [];
  let prev = null;
  for (const page of sorted) {
    prev !== null && page - prev > 1 && list.push("…");
    (list.push(page), (prev = page));
  }
  return list;
}
function Pager({
  total: total = 0,
  page: page = 1,
  pageSize: pageSize = 10,
  onPageChange: onPageChange,
  onPageSizeChange: onPageSizeChange,
  pageSizeOptions: pageSizeOptions = [10, 20, 50],
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize)),
    currentPage = Math.min(Math.max(1, page), totalPages),
    pageList = buildPagerPageList(currentPage, totalPages);
  return jsx.jsxs("div", {
    className: "pager",
    children: [
      jsx.jsx("span", { children: `共 ${total} 條` }),
      jsx.jsx(Select, {
        value: pageSize,
        onChange: (event) => onPageSizeChange && onPageSizeChange(Number(event.target.value)),
        children: pageSizeOptions.map((size) => jsx.jsx("option", { value: size, children: `${size} 條/頁` }, size)),
      }),
      jsx.jsx("button", {
        disabled: currentPage <= 1,
        onClick: () => onPageChange && onPageChange(currentPage - 1),
        children: jsx.jsx(G8, {}),
      }),
      pageList.map((item, index) =>
        item === "…"
          ? jsx.jsx("span", { children: "…" }, `ellipsis-${index}`)
          : jsx.jsx(
              "button",
              {
                className: item === currentPage ? "active" : "",
                onClick: () => onPageChange && onPageChange(item),
                children: `${item}`,
              },
              item,
            ),
      ),
      jsx.jsx("button", {
        disabled: currentPage >= totalPages,
        onClick: () => onPageChange && onPageChange(currentPage + 1),
        children: jsx.jsx(Q8, {}),
      }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：申請列表共用（搜尋／表格／卡片）---- */
function SearchFilters({ showParty: showParty = true, onSearch: onSearch }) {
  return jsx.jsxs("div", {
    className: "filters",
    children: [
      jsx.jsx(Field, {
        label: "關鍵字",
        children: jsx.jsx("input", { placeholder: "姓名或申請編號" }),
      }),
      jsx.jsx(Field, {
        label: "申請類型",
        children: jsx.jsxs(Select, {
          value: "全部",
          children: [
            jsx.jsx("option", { children: "全部" }),
            jsx.jsx("option", { children: "申請" }),
            jsx.jsx("option", { children: "續期" }),
            jsx.jsx("option", { children: "廢止" }),
          ],
        }),
      }),
      jsx.jsx(Field, {
        label: "來源",
        children: jsx.jsxs(Select, {
          value: "全部",
          children: [
            jsx.jsx("option", { children: "全部" }),
            jsx.jsx("option", { children: "一戶通" }),
            jsx.jsx("option", { children: "親臨" }),
          ],
        }),
      }),
      showParty &&
        jsx.jsx(Field, {
          label: "申請方",
          children: jsx.jsxs(Select, {
            value: "全部",
            children: [
              jsx.jsx("option", { children: "全部" }),
              jsx.jsx("option", { children: "本人" }),
              jsx.jsx("option", { children: "親屬" }),
            ],
          }),
        }),
      jsx.jsx(Field, {
        label: "狀態",
        children: jsx.jsxs(Select, {
          value: "全部",
          children: [
            jsx.jsx("option", { children: "全部" }),
            jsx.jsx("option", { children: "待處理" }),
            jsx.jsx("option", { children: "待通知補件" }),
            jsx.jsx("option", { children: "已通知補件" }),
            jsx.jsx("option", { children: "退回" }),
            jsx.jsx("option", { children: "待複核" }),
            jsx.jsx("option", { children: "待審批" }),
            jsx.jsx("option", { children: "已審批" }),
            jsx.jsx("option", { children: "已通知取件" }),
            jsx.jsx("option", { children: "完成" }),
            jsx.jsx("option", { children: "作廢" }),
          ],
        }),
      }),
      jsx.jsx(Button, { onClick: onSearch, icon: Na, children: "查詢" }),
    ],
  });
}
function ApplicationsTable({ rows: rows, onOpen: onOpen, actionLabel: actionLabel = "查看", page: page = 1, pageSize: pageSize = 10 }) {
  const [sort, setSort] = React.useState({ key: null, direction: "asc" }),
    onSort = (nextSort) => setSort(nextSort),
    sortedRows = React.useMemo(
      () =>
        sortRowsForDisplay(rows, sort, {
          id: (row) => row.id,
          name: (row) => row.name,
          type: (row) => row.type,
          source: (row) => row.source,
          status: (row) => row.status,
          notify: (row) => row.notify,
          time: (row) => row.time,
        }),
      [rows, sort],
    ),
    totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize)),
    currentPage = Math.min(Math.max(1, page), totalPages),
    pagedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return jsx.jsx("div", {
    className: "table-wrap",
    children: jsx.jsxs("table", {
      children: [
        jsx.jsx("thead", {
          children: jsx.jsxs("tr", {
            children: [
              jsx.jsx(SortableTh, { label: "申請編號", sortKey: "id", sort: sort, onSort: onSort }),
              jsx.jsx(SortableTh, { label: "申請人", sortKey: "name", sort: sort, onSort: onSort }),
              jsx.jsx(SortableTh, { label: "類型", sortKey: "type", sort: sort, onSort: onSort }),
              jsx.jsx(SortableTh, { label: "來源", sortKey: "source", sort: sort, onSort: onSort }),
              jsx.jsx(SortableTh, { label: "狀態", sortKey: "status", sort: sort, onSort: onSort }),
              jsx.jsx(SortableTh, { label: "通知方式", sortKey: "notify", sort: sort, onSort: onSort }),
              jsx.jsx(SortableTh, { label: "申請時間", sortKey: "time", sort: sort, onSort: onSort }),
              jsx.jsx("th", { children: "操作" }),
            ],
          }),
        }),
        jsx.jsxs("tbody", {
          children: [
            pagedRows.map((row) =>
              jsx.jsxs(
                "tr",
                {
                  children: [
                    jsx.jsx("td", { className: "strong", children: row.id }),
                    jsx.jsx("td", { children: row.name }),
                    jsx.jsx("td", { children: row.type }),
                    jsx.jsx("td", { children: row.source }),
                    jsx.jsx("td", {
                      children: jsx.jsx(Badge, { children: row.status }),
                    }),
                    jsx.jsx("td", { children: row.notify }),
                    jsx.jsx("td", { children: row.time }),
                    jsx.jsx("td", {
                      children: jsx.jsx(Button, {
                        variant: "outline",
                        onClick: () => onOpen(row),
                        children: actionLabel,
                      }),
                    }),
                  ],
                },
                row.id,
              ),
            ),
            rows.length === 0 && jsx.jsx(TableEmptyState, { cols: 8 }),
          ],
        }),
      ],
    }),
  });
}
function DraftRecordsPanel({ onDeleteDraft: onDeleteDraft, onContinueDraft: onContinueDraft }) {
  const [drafts, setDrafts] = React.useState(() => listDrafts()),
    [sort, setSort] = React.useState({ key: null, direction: "asc" }),
    onSort = (nextSort) => setSort(nextSort),
    sortedDrafts = React.useMemo(
      () =>
        sortRowsForDisplay(drafts, sort, {
          docType: (item) => item.docType,
          docNo: (item) => item.docNo,
          draftType: (item) => draftTypeLabel(item.draft),
          savedAt: (item) => item.draft.savedAt,
        }),
      [drafts, sort],
    );
  return jsx.jsxs("section", {
    className: "panel",
    children: [
      jsx.jsxs("div", {
        className: "section-title",
        children: [
          jsx.jsx("h2", { children: "暫存" }),

        ],
      }),
      jsx.jsx("div", {
        className: "table-wrap",
        children: jsx.jsxs("table", {
          children: [
            jsx.jsx("thead", {
              children: jsx.jsxs("tr", {
                children: [
                  jsx.jsx(SortableTh, { label: "證件類型", sortKey: "docType", sort: sort, onSort: onSort }),
                  jsx.jsx(SortableTh, { label: "證件號碼", sortKey: "docNo", sort: sort, onSort: onSort }),
                  jsx.jsx(SortableTh, { label: "申請類型", sortKey: "draftType", sort: sort, onSort: onSort }),
                  jsx.jsx(SortableTh, { label: "暫存時間", sortKey: "savedAt", sort: sort, onSort: onSort }),
                  jsx.jsx("th", { children: "操作" }),
                ],
              }),
            }),
            jsx.jsx("tbody", {
              children:
                drafts.length > 0
                  ? sortedDrafts.map((item) =>
                      jsx.jsxs(
                        "tr",
                        {
                          children: [
                            jsx.jsx("td", { className: "strong", children: item.docType }),
                            jsx.jsx("td", { children: item.docNo }),
                            jsx.jsx("td", { children: draftTypeLabel(item.draft) }),
                            jsx.jsx("td", { children: item.draft.savedAt || "—" }),
                            jsx.jsx("td", {
                              children: jsx.jsxs("div", {
                                className: "button-row",
                                children: [
                                  jsx.jsx(Button, {
                                    onClick: () => onContinueDraft && onContinueDraft(item),
                                    children: "繼續",
                                  }),
                                  jsx.jsx(Button, {
                                    variant: "outline",
                                    onClick: () => {
                                      (removeDraft(item.key),
                                        setDrafts(drafts.filter((draft) => draft.key !== item.key)),
                                        onDeleteDraft && onDeleteDraft());
                                    },
                                    children: "刪除",
                                  }),
                                ],
                              }),
                            }),
                          ],
                        },
                        item.key,
                      ),
                    )
                  : jsx.jsx("tr", {
                      className: "empty-state",
                      children: jsx.jsx("td", {
                        colSpan: 5,
                        children: jsx.jsxs("div", {
                          children: [
                            jsx.jsx("strong", { children: "暫無暫存草稿" }),
                            jsx.jsx("span", { children: "臨櫃收件時未完成填寫的申請會自動暫存在此。" }),
                          ],
                        }),
                      }),
                    }),
            }),
          ],
        }),
      }),
    ],
  });
}
function DashboardScreen({ applications: applications, onOpen: onOpen, onNavigate: onNavigate, role: role, onDeleteDraft: onDeleteDraft, onContinueDraft: onContinueDraft }) {
  const [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10),
    today = new Date("2026-08-29"),
    actionable = getActionableApplications(applications, role),
    overdue = actionable.filter(
      (app) =>
        today.getTime() - new Date(app.time.replace(" ", "T")).getTime() >
        DemoData.slaDays * 864e5,
    ),
    countsByStatus = actionable.reduce((app, count) => ({ ...app, [count.status]: (app[count.status] || 0) + 1 }), {}),
    statusSummary = Object.entries(countsByStatus)
      .map(([app, count]) => `${app} ${count}`)
      .join(" · ") || "目前沒有待辦案件",
    overdueSummary =
      overdue.length > 0
        ? `最久 ${Math.floor(
            (today.getTime() -
              Math.min(
                ...overdue.map((app) =>
                  new Date(app.time.replace(" ", "T")).getTime(),
                ),
              )) /
              864e5,
          )} 天未處理`
        : "目前沒有逾期案件";
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsxs("div", {
        className: "page-heading",
        children: [
          jsx.jsxs("div", {
            children: [
              jsx.jsx("p", { className: "eyebrow" }),
              jsx.jsx("h1", { children: "工作台" }),
            ],
          }),

        ],
      }),
      jsx.jsxs("div", {
        className: "metrics",
        children: [
          jsx.jsxs("article", {
            children: [
              jsx.jsx("span", {
                className: "metric-icon",
                children: jsx.jsx(V0, { size: 22, weight: "duotone" }),
              }),
              jsx.jsx("span", {
                className: "metric-label amber-dot",
                children: "我的待辦",
              }),
              jsx.jsx("strong", { children: actionable.length }),
              jsx.jsx("small", { children: statusSummary }),
            ],
          }),
          jsx.jsxs("article", {
            className: "metric-card-danger",
            children: [
              jsx.jsx("span", {
                className: "metric-icon",
                children: jsx.jsx(B8, { size: 22, weight: "duotone" }),
              }),
              jsx.jsx("span", {
                className: "metric-label red-dot",
                children: "超時未處理",
              }),
              jsx.jsx("strong", { children: overdue.length }),
              jsx.jsx("small", { children: overdueSummary }),
            ],
          }),
        ],
      }),
      jsx.jsx(DraftRecordsPanel, { onDeleteDraft: onDeleteDraft, onContinueDraft: onContinueDraft }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "panel-head",
            children: jsx.jsxs("div", {
              children: [
                jsx.jsx("h2", { children: "待辦申請" }),
                jsx.jsx("p", { children: "按優先次序顯示需要處理的案件" }),
              ],
            }),
          }),
          jsx.jsx(SearchFilters, {}),
          jsx.jsx(ApplicationsTable, {
            rows: actionable,
            onOpen: onOpen,
            actionLabel: "查看處理",
            page: page,
            pageSize: pageSize,
          }),
          jsx.jsx(Pager, {
            total: actionable.length,
            page: page,
            pageSize: pageSize,
            onPageChange: setPage,
            onPageSizeChange: (size) => (setPageSize(size), setPage(1)),
          }),
        ],
      }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：臨櫃收件流程（申請／廢止）---- */
function IntakeReadScreen({ mode: mode, onContinue: onContinue, fillKey: fillKey, fillScenario: fillScenario, onDirty: onDirty }) {
  const [readMethod, setReadMethod] = React.useState(""),
    [docNumber, setDocNumber] = React.useState(""),
    [isIdRead, setIdRead] = React.useState(false),
    [gender, setGender] = React.useState("男"),
    [birth, setBirth] = React.useState(""),
    [docType, setDocType] = React.useState(""),
    [enName, setEnName] = React.useState(""),
    [invalidFields, setInvalidFields] = React.useState([]),
    selectMethod = (method) => {
      (setReadMethod(method), setIdRead(true), setEnName("CHAN DAI MAN"), setDocNumber("13888888"), setBirth("1998-08-08"), setDocType("澳門居民身份證"), setInvalidFields([]));
    },
    clearInvalid = (key) => setInvalidFields(invalidFields.filter((field) => field !== key)),
    validateAndContinue = () => {
      const missing = [];
      if (!enName.trim()) missing.push("en");
      if (!birth) missing.push("birth");
      if (!docType) missing.push("docType");
      if (!docNumber.trim()) missing.push("docNo");
      if (missing.length) return setInvalidFields(missing);
      onContinue({ mode: mode, docNo: docNumber, applicant: { gender: gender, birth: birth, docType: docType } });
    };
  const intakeDirtyKey = JSON.stringify([readMethod, gender, enName, birth, docType, docNumber]),
    intakeDirtyBaselineRef = React.useRef(null);
  React.useEffect(() => {
    const profile = fillKey > 0 && DemoFillProfiles[fillScenario];
    if (profile) {
      (setIdRead(true), setGender(profile.gender), setEnName(profile.enName), setBirth(profile.birth), setDocType(profile.docType), setDocNumber(profile.docNo), setInvalidFields([]));
    }
  }, [fillKey]);
  React.useEffect(() => {
    if (intakeDirtyBaselineRef.current === null) intakeDirtyBaselineRef.current = intakeDirtyKey;
    else if (intakeDirtyBaselineRef.current !== intakeDirtyKey) onDirty && onDirty();
  }, [intakeDirtyKey]);
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx("div", {
        className: "page-heading",
        children: jsx.jsxs("div", {
          children: [
            jsx.jsx("p", { className: "eyebrow", children: "臨櫃收件" }),
            jsx.jsx("h1", {
              children: mode === "terminate" ? "廢止申請" : "申請",
            }),
            jsx.jsx("p", { children: "讀取身份資料並檢查現有禁入紀錄。" }),
          ],
        }),
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "section-title",
            children: [
              jsx.jsx("h2", { children: "讀取證件方式" }),
              jsx.jsx("span", { children: "身份驗證" }),
            ],
          }),
          jsx.jsx(WizardProgress, { current: 1, steps: mode === "terminate" ? WizardSteps.terminate : WizardSteps.intake }),
          jsx.jsxs("div", {
            className: "read-methods",
            children: [
              jsx.jsxs("button", {
                className: readMethod === "card" ? "selected" : "",
                onClick: () => selectMethod("card"),
                children: [
                  jsx.jsx(Md, { size: 60 }),
                  jsx.jsx("b", { children: "讀取身份證資料" }),
                ],
              }),
              jsx.jsxs("button", {
                className: readMethod === "qr" ? "selected" : "",
                onClick: () => selectMethod("qr"),
                children: [
                  jsx.jsx(Zd, { size: 60 }),
                  jsx.jsx("b", { children: "掃描身份識別二維碼" }),
                ],
              }),
            ],
          }),
          jsx.jsxs("div", {
            className: "form-section",
            children: [
              jsx.jsx("h3", { children: "申請人證件資料" }),
              jsx.jsxs("div", {
                className: "form-grid",
                children: [
                  jsx.jsx(Field, {
                    label: "姓名（中文）",
                    required: false,
                    children: jsx.jsx("input", {
                      defaultValue: isIdRead ? "陳大文" : "",
                      placeholder: "請輸入",
                    }),
                  }),
                  jsx.jsx(Field, {
                    label: "姓名（外文）",
                    required: true,
                    children: jsx.jsx("input", {
                      value: enName,
                      onChange: (event) => (setEnName(event.target.value), clearInvalid("en")),
                      placeholder: "請輸入",
                      className: invalidFields.includes("en") ? "input-error" : "",
                    }),
                  }),
                  jsx.jsx(Field, {
                    label: "性別",
                    required: true,
                    children: jsx.jsxs("div", {
                      className: "radio-row",
                      children: [
                        jsx.jsxs("label", {
                          children: [
                            jsx.jsx("input", {
                              type: "radio",
                              name: "gender",
                              checked: gender === "男",
                              onChange: () => setGender("男"),
                            }),
                            " 男",
                          ],
                        }),
                        jsx.jsxs("label", {
                          children: [
                            jsx.jsx("input", {
                              type: "radio",
                              name: "gender",
                              checked: gender === "女",
                              onChange: () => setGender("女"),
                            }),
                            " 女",
                          ],
                        }),
                      ],
                    }),
                  }),
                  jsx.jsx(Field, {
                    label: "出生日期",
                    required: true,
                    children: jsx.jsx("input", {
                      type: "date",
                      value: birth,
                      onChange: (event) => (setBirth(event.target.value), clearInvalid("birth")),
                      className: invalidFields.includes("birth") ? "input-error" : "",
                    }),
                  }),
                  jsx.jsx(Field, {
                    label: "證件類型",
                    required: true,
                    children: jsx.jsxs(Select, {
                      value: docType,
                      onChange: (event) => (setDocType(event.target.value), clearInvalid("docType")),
                      className: invalidFields.includes("docType") ? "input-error" : "",
                      children: [
                        jsx.jsx("option", { children: "澳門居民身份證" }),
                        jsx.jsx("option", { children: "外地僱員身份認別證" }),
                        jsx.jsx("option", { children: "護照" }),
                      ],
                    }),
                  }),
                  jsx.jsx(Field, {
                    label: "證件號碼",
                    required: true,
                    children: jsx.jsx("input", {
                      value: docNumber,
                      onChange: (event) => (setDocNumber(event.target.value), clearInvalid("docNo")),
                      className: invalidFields.includes("docNo") ? "input-error" : "",
                    }),
                  }),
                ],
              }),
            ],
          }),
          jsx.jsxs("div", {
            className: "form-actions",
            children: [
              jsx.jsx("span", {}),
              jsx.jsx(Button, {
                onClick: validateAndContinue,
                children: "下一步",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function RecordCheck({ mode: mode, docNo: docNo, docType: docType, onBack: onBack, onContinue: onContinue }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recordKey = docType && docNo ? `${docType}:${docNo}` : "",
    records = ((DemoData.exclusionHistory && recordKey && DemoData.exclusionHistory[recordKey]) || []).map(
      (record) => ({ ...record, status: new Date(record.end) >= today ? "生效中" : "已失效" }),
    ),
    activeRecord = records.find((record) => record.status === "生效中"),
    daysLeft = activeRecord ? Math.round((new Date(activeRecord.end) - today) / 864e5) : null,
    resultType =
      mode === "terminate"
        ? activeRecord
          ? "terminate"
          : "no-record-terminate"
        : !activeRecord
          ? "new"
          : daysLeft <= 30
            ? "renew"
            : "blocked";
  const [recordSort, setRecordSort] = React.useState({ key: null, direction: "asc" }),
    onRecordSort = (nextSort) => setRecordSort(nextSort),
    sortedRecords = sortRowsForDisplay(records, recordSort, {
      id: (record) => record.id,
      scope: (record) => record.scope,
      createdAt: (record) => record.createdAt,
      start: (record) => record.start,
      end: (record) => record.end,
    });
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx("div", {
        className: "page-heading",
        children: jsx.jsxs("div", {
          children: [
            jsx.jsx("p", { className: "eyebrow", children: "臨櫃收件" }),
            jsx.jsx("h1", { children: mode === "terminate" ? "廢止申請" : "申請" }),
            jsx.jsx("p", { children: "核查申請人現有的禁入紀錄。" }),
          ],
        }),
      }),
      jsx.jsxs("section", {
        className: "panel wizard-panel",
        children: [
          jsx.jsxs("div", {
            className: "section-title",
            children: [
              jsx.jsx("h2", { children: "核查禁入紀錄" }),
              jsx.jsx("span", { children: "核查紀錄" }),
            ],
          }),
          jsx.jsx(WizardProgress, { current: 2, steps: mode === "terminate" ? WizardSteps.terminate : WizardSteps.intake }),
          jsx.jsxs("div", {
            className: "section-title",
            children: [
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("h2", {
                    children: activeRecord ? "此證件查有禁入紀錄" : "此證件查無禁入紀錄",
                  }),
                  jsx.jsx("p", {
                    children: `證件類型：${docType || "—"}　證件號碼：${docNo || "—"}`,
                  }),
                ],
              }),
              activeRecord && jsx.jsx(Badge, { children: activeRecord.status }),
            ],
          }),
          resultType === "new" &&
            jsx.jsx("div", {
              className: "record-alert",
              children: jsx.jsx("span", {
                children:
                  "系統已將申請人資料與現有記錄進行比對，未發現相符的禁入紀錄，可直接進行新申請。",
              }),
            }),
          records.length > 0 &&
            jsx.jsx("div", {
              className: "table-wrap",
              children: jsx.jsxs("table", {
                children: [
                  jsx.jsx("thead", {
                    children: jsx.jsxs("tr", {
                      children: [
                        jsx.jsx(SortableTh, { label: "編號", sortKey: "id", sort: recordSort, onSort: onRecordSort }),
                        jsx.jsx(SortableTh, { label: "禁入娛樂場範圍", sortKey: "scope", sort: recordSort, onSort: onRecordSort }),
                        jsx.jsx(SortableTh, { label: "創建時間", sortKey: "createdAt", sort: recordSort, onSort: onRecordSort }),
                        jsx.jsx(SortableTh, { label: "生效時間", sortKey: "start", sort: recordSort, onSort: onRecordSort }),
                        jsx.jsx(SortableTh, { label: "廢止時間", sortKey: "end", sort: recordSort, onSort: onRecordSort }),
                        jsx.jsx("th", { children: "操作" }),
                      ],
                    }),
                  }),
                  jsx.jsx("tbody", {
                    children: sortedRecords.map((record) =>
                      jsx.jsxs(
                        "tr",
                        {
                          children: [
                            jsx.jsx("td", { className: "strong", children: record.id }),
                            jsx.jsx("td", { children: record.scope }),
                            jsx.jsx("td", { children: record.createdAt }),
                            jsx.jsx("td", { children: record.start }),
                            jsx.jsx("td", { children: record.end }),
                            jsx.jsx("td", {
                              children: jsx.jsx(Button, {
                                variant: "outline",
                                children: "查閱",
                              }),
                            }),
                          ],
                        },
                        record.id,
                      ),
                    ),
                  }),
                ],
              }),
            }),
          resultType === "blocked" &&
            jsx.jsx("div", {
              className: "record-alert",
              children: jsx.jsx("span", {
                children: `此禁令將於 ${activeRecord.end} 到期，距今尚餘 ${daysLeft} 天，未到續期受理時間（到期前 30 天內）。`,
              }),
            }),
          resultType === "no-record-terminate" &&
            jsx.jsx("div", {
              className: "record-alert",
              children: jsx.jsx("span", {
                children: "查無可廢止的禁入紀錄，請確認證件類型及證件號碼是否正確。",
              }),
            }),
          jsx.jsxs("div", {
            className: "form-actions",
            children: [
              jsx.jsx(Button, { variant: "ghost", onClick: onBack, children: "上一步" }),
              resultType === "new"
                ? jsx.jsx(Button, {
                    onClick: () => onContinue("新申請"),
                    children: "進行申請",
                  })
                : resultType === "renew"
                  ? jsx.jsx(Button, {
                      onClick: () => onContinue("續期"),
                      children: "進行續期申請",
                    })
                  : resultType === "terminate"
                    ? jsx.jsx(Button, {
                        onClick: () => onContinue(true),
                        children: "進行廢止申請",
                      })
                    : jsx.jsx(Button, {
                        disabled: true,
                        children:
                          resultType === "blocked" ? "尚未到續期時間" : "無法廢止",
                      }),
            ],
          }),
        ],
      }),
    ],
  });
}
function ApplicationFormScreen({ mode: mode, onSubmit: onSubmit, onCancel: onCancel, docNo: docNo, appType: appType, applicant: applicant = {}, fillKey: fillKey, resumeDraft: resumeDraft, onSaveRef: onSaveRef, onDirty: onDirty }) {
  const initialDraft = resumeDraft && resumeDraft.v === 1 ? resumeDraft : null,
    [step, setStep] = React.useState(() => (initialDraft && initialDraft.step) || 1),
    [partyType, setPartyType] = React.useState(() => (initialDraft && initialDraft.partyType) || ""),
    [term, setTerm] = React.useState(() => (initialDraft && initialDraft.term) || ""),
    [scope, setScope] = React.useState(() => (initialDraft && initialDraft.scope) || ""),
    [counsel, setCounsel] = React.useState(() => (initialDraft && initialDraft.counsel) || ""),
    [documents, setDocuments] = React.useState(() => (initialDraft && initialDraft.documents) || []),
    [docType, setDocType] = React.useState(() => (initialDraft && initialDraft.docType) || ""),
    [photoName, setPhotoName] = React.useState(() => (initialDraft && initialDraft.photoName) || ""),
    [previewFile, setPreviewFile] = React.useState(null),
    [personal, setPersonal] = React.useState(() => ({
      occupation: "",
      email: "",
      phoneCode: "+853",
      phone: "",
      address: "",
      ...((initialDraft && initialDraft.personal) || {}),
    })),
    [effectiveDate, setEffectiveDate] = React.useState(() => (initialDraft && initialDraft.effectiveDate) || ""),
    [endDate, setEndDate] = React.useState(() => (initialDraft && initialDraft.endDate) || ""),
    [termInvalidFields, setTermInvalidFields] = React.useState([]),
    [companies, setCompanies] = React.useState(() => (initialDraft && initialDraft.companies) || []),
    [relativeDocType, setRelativeDocType] = React.useState(() => (initialDraft && initialDraft.relativeDocType) || ""),
    [relativeFiles, setRelativeFiles] = React.useState(() => (initialDraft && initialDraft.relativeFiles) || []),
    [relativeReadMethod, setRelativeReadMethod] = React.useState(() => (initialDraft && initialDraft.relativeReadMethod) || ""),
    [relative, setRelative] = React.useState(() => ({
      relation: "",
      name: "",
      en: "",
      gender: "",
      birth: "",
      docType: "",
      docNo: "",
      occupation: "",
      email: "",
      phoneCode: "+853",
      phone: "",
      address: "",
      ...((initialDraft && initialDraft.relative) || {}),
    })),
    [relativeInvalid, setRelativeInvalid] = React.useState([]),
    termMonths = { "六個月": 6, "一年": 12, "十八個月": 18, "兩年": 24 },
    computeTermEndDate = (termValue, effectiveDateValue) => {
      const months = termMonths[termValue];
      if (!months || !effectiveDateValue) return "";
      const [year, month, day] = effectiveDateValue.split("-").map(Number);
      const totalMonths = month - 1 + months;
      return `${year + Math.floor(totalMonths / 12)}-${String((totalMonths % 12) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    },
    clearTermInvalid = (key) => setTermInvalidFields(termInvalidFields.filter((field) => field !== key)),
    fillDefaults = () => {
      (setPartyType("本人申請"),
        setTerm("一年"),
        setScope("全部"),
        setCounsel("同意"),
        setDocuments([{ type: "澳門居民身份證", name: "澳門身份證partyType.jpg" }]),
        setDocType("澳門居民身份證"),
        setPhotoName("近照.jpg"),
        setPersonal({ occupation: "文員", email: "demo@example.com", phoneCode: "+853", phone: "63886688", address: "澳門慕拉士大馬路222號地下" }),
        setEffectiveDate("2026-08-09"),
        setEndDate("2027-08-09"),
        setTermInvalidFields([]),
        setCompanies([]),
        setRelativeDocType("澳門居民身份證"),
        setRelativeFiles([{ type: "澳門居民身份證", name: "親屬身份證正面.jpg" }]),
        setRelativeReadMethod(""),
        setRelative({
          relation: "配偶",
          name: "陳小文",
          en: "CHAN MAN",
          gender: "男",
          birth: "2000-08-08",
          docType: "澳門居民身份證",
          docNo: "13888880",
          occupation: "文員",
          email: "demo@example.com",
          phoneCode: "+853",
          phone: "63886688",
          address: "澳門黑沙環新街456號",
        }),
        setRelativeInvalid([]));
    },
    selectRelativeMethod = (method) => {
      (setRelativeReadMethod(method),
        setRelative({
          ...relative,
          name: "陳小文",
          en: "CHAN MAN",
          gender: "男",
          birth: "2000-08-08",
          docType: "澳門居民身份證",
          docNo: "13888880",
        }),
        setRelativeInvalid([]));
    },
    clearRelativeInvalid = (key) => setRelativeInvalid(relativeInvalid.filter((field) => field !== key)),
    validateRelative = () => {
      const missing = [];
      if (!relative.en.trim()) missing.push("en");
      if (!relative.birth) missing.push("birth");
      if (!relative.docType) missing.push("docType");
      if (!relative.docNo.trim()) missing.push("docNo");
      if (missing.length) return setRelativeInvalid(missing);
      setStep(4);
    },
    formData = {
      name: "陳大文",
      en: "CHAN DAI MAN",
      doc: docNo || "",
      party: partyType,
      term: term,
      scope: scope,
      counsel: counsel,
      mode: mode,
      appType: appType,
      applicant: applicant,
      personal: personal,
      effectiveDate: effectiveDate,
      endDate: endDate,
      companies: companies,
      relative: relative,
    };
  const draftKeyValue = applicant.docType && docNo ? buildDraftKey(applicant.docType, docNo) : null,
    draftSnapshot = {
      v: 1,
      savedAt: formatNow(),
      mode: mode,
      appType: appType,
      docNo: docNo || "",
      applicant: applicant,
      step: step,
      partyType: partyType,
      term: term,
      scope: scope,
      counsel: counsel,
      docType: docType,
      documents: documents,
      photoName: photoName,
      personal: personal,
      effectiveDate: effectiveDate,
      endDate: endDate,
      companies: companies,
      relativeDocType: relativeDocType,
      relativeFiles: relativeFiles,
      relativeReadMethod: relativeReadMethod,
      relative: relative,
    },
    draftHasContent =
      step > 1 ||
      partyType ||
      term ||
      scope ||
      counsel ||
      documents.length > 0 ||
      photoName ||
      personal.occupation ||
      personal.phone ||
      personal.address ||
      effectiveDate ||
      endDate ||
      companies.length > 0 ||
      relative.name ||
      relative.docNo,
    draftBodyKey = JSON.stringify([
      partyType,
      term,
      scope,
      counsel,
      docType,
      documents,
      photoName,
      personal,
      effectiveDate,
      endDate,
      companies,
      relativeDocType,
      relativeFiles,
      relativeReadMethod,
      relative,
    ]),
    draftDirtyBaselineRef = React.useRef(null),
    [draftPending, setDraftPending] = React.useState(null),
    draftDecidedRef = React.useRef(Boolean(initialDraft)),
    applyDraft = (saved) => {
      (setStep(saved.step || 1),
        setPartyType(saved.partyType || ""),
        setTerm(saved.term || ""),
        setScope(saved.scope || ""),
        setCounsel(saved.counsel || ""),
        setDocType(saved.docType || ""),
        setDocuments(saved.documents || []),
        setPhotoName(saved.photoName || ""),
        setPersonal({ occupation: "", email: "", phoneCode: "+853", phone: "", address: "", ...(saved.personal || {}) }),
        setEffectiveDate(saved.effectiveDate || ""),
        setEndDate(saved.endDate || ""),
        setTermInvalidFields([]),
        setCompanies(saved.companies || []),
        setRelativeDocType(saved.relativeDocType || ""),
        setRelativeFiles(saved.relativeFiles || []),
        setRelativeReadMethod(saved.relativeReadMethod || ""),
        setRelative({ relation: "", name: "", en: "", gender: "", birth: "", docType: "", docNo: "", occupation: "", email: "", phoneCode: "+853", phone: "", address: "", ...(saved.relative || {}) }),
        setRelativeInvalid([]),
        setDraftPending(null),
        (draftDecidedRef.current = true));
    },
    dismissDraft = () => (setDraftPending(null), (draftDecidedRef.current = true)),
    discardDraft = () => (removeDraft(draftKeyValue), setDraftPending(null), (draftDecidedRef.current = true));
  React.useEffect(() => {
    if (fillKey > 0) fillDefaults();
  }, [fillKey]);
  React.useEffect(() => {
    if (initialDraft || !draftKeyValue || fillKey > 0) return;
    const saved = loadDraft(draftKeyValue);
    if (saved) setDraftPending(saved);
    else draftDecidedRef.current = true;
  }, []);
  React.useEffect(() => {
    if (!draftKeyValue || draftPending || !draftDecidedRef.current || !draftHasContent) return;
    const timer = setTimeout(() => saveDraft(draftKeyValue, draftSnapshot), 400);
    return () => clearTimeout(timer);
  }, [draftKeyValue, draftPending, draftHasContent, JSON.stringify(draftSnapshot)]);
  React.useEffect(() => {
    if (!onSaveRef) return;
    onSaveRef(() => {
      if (!draftKeyValue || draftPending || !draftHasContent) return;
      saveDraft(draftKeyValue, draftSnapshot);
    });
    return () => onSaveRef(null);
  }, [draftKeyValue, draftPending, draftHasContent, JSON.stringify(draftSnapshot)]);
  React.useEffect(() => {
    if (draftDirtyBaselineRef.current === null) draftDirtyBaselineRef.current = draftBodyKey;
    else if (draftDirtyBaselineRef.current !== draftBodyKey) onDirty && onDirty();
  }, [draftBodyKey]);
  const isRelative = partyType === "親屬申請" && mode !== "terminate",
    previewStep = isRelative ? 5 : 3,
    wizardSteps = mode === "terminate" ? WizardSteps.terminate : isRelative ? WizardSteps.relative : WizardSteps.intake,
    wizardCurrent = step === previewStep ? wizardSteps.length : mode === "terminate" ? 3 : step + 2;
  const content =
    step === 1 && mode !== "terminate"
    ? jsx.jsxs("section", {
        className: "panel wizard-panel",
        children: [
          jsx.jsxs("div", {
            className: "section-title",
            children: [
              jsx.jsx("h2", { children: "選擇申請方式" }),
              jsx.jsx("span", { children: "填寫申請資料" }),
            ],
          }),
          jsx.jsx(WizardProgress, { current: wizardCurrent, steps: wizardSteps }),
          jsx.jsx("div", {
            className: "party-cards",
            children: ["本人申請", "親屬申請"].map((option, index) =>
              jsx.jsxs(
                "button",
                {
                  className: partyType === option ? "selected" : "",
                  onClick: () => setPartyType(option),
                  children: [
                    index === 0
                      ? jsx.jsx(Td, { size: 44 })
                      : jsx.jsx(rf, { size: 44 }),
                    jsx.jsx("b", { children: option }),
                    jsx.jsx("span", {
                      children:
                        index === 0
                          ? "申請人親自到臨櫃辦理"
                          : "配偶、尊親屬、卑親屬或兄弟姊妹",
                    }),
                  ],
                },
                option,
              ),
            ),
          }),
          jsx.jsxs("div", {
            className: "form-actions",
            children: [
              jsx.jsx(Button, { variant: "ghost", onClick: onCancel, children: "上一步" }),
              jsx.jsx(Button, { onClick: () => setStep(2), disabled: !partyType, children: "下一步" }),
            ],
          }),
        ],
      })
    : step === previewStep
      ? jsx.jsx(ApplicationPreviewScreen, {
          data: formData,
          documents: documents,
          photoName: photoName,
          relativeFiles: relativeFiles,
          onBack: () => setStep(previewStep - 1),
          onSubmit: () => onSubmit(formData),
          onPreviewFile: setPreviewFile,
        })
      : step === 3 && isRelative
        ? jsx.jsxs("section", {
            className: "panel wizard-panel",
            children: [
              jsx.jsxs("div", {
                className: "section-title",
                children: [
                  jsx.jsx("h2", { children: "填寫親屬證件資料" }),
                  jsx.jsx("span", { children: "填寫申請資料" }),
                ],
              }),
              jsx.jsx(WizardProgress, { current: wizardCurrent, steps: wizardSteps }),
              jsx.jsxs("div", {
                className: "form-section",
                children: [
                  jsx.jsx("h3", { children: "讀取證件方式" }),
                  jsx.jsxs("div", {
                    className: "read-methods",
                    children: [
                      jsx.jsxs("button", {
                        className: relativeReadMethod === "card" ? "selected" : "",
                        onClick: () => selectRelativeMethod("card"),
                        children: [
                          jsx.jsx(Md, { size: 60 }),
                          jsx.jsx("b", { children: "讀取身份證資料" }),
                          jsx.jsx("small", { children: "模擬晶片讀卡機" }),
                        ],
                      }),
                      jsx.jsxs("button", {
                        className: relativeReadMethod === "qr" ? "selected" : "",
                        onClick: () => selectRelativeMethod("qr"),
                        children: [
                          jsx.jsx(Zd, { size: 60 }),
                          jsx.jsx("b", { children: "掃描身份識別二維碼" }),
                          jsx.jsx("small", { children: "模擬二維碼掃描" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              jsx.jsxs("div", {
                className: "form-section",
                children: [
                  jsx.jsx("h3", { children: "親屬證件資料" }),
                  jsx.jsxs("div", {
                    className: "form-grid",
                    children: [
                      jsx.jsx(Field, {
                        label: "姓名（中文）",
                        required: true,
                        children: jsx.jsx("input", {
                          value: relative.name,
                          onChange: (event) =>
                            setRelative({ ...relative, name: event.target.value }),
                        }),
                      }),
                      jsx.jsx(Field, {
                        label: "姓名（外文）",
                        required: true,
                        children: jsx.jsx("input", {
                          value: relative.en,
                          onChange: (event) =>
                            (setRelative({ ...relative, en: event.target.value }), clearRelativeInvalid("en")),
                          className: relativeInvalid.includes("en") ? "input-error" : "",
                        }),
                      }),
                      jsx.jsx(Field, {
                        label: "性別",
                        required: true,
                        children: jsx.jsxs("div", {
                          className: "radio-row",
                          children: [
                            jsx.jsxs("label", {
                              children: [
                                jsx.jsx("input", {
                                  type: "radio",
                                  name: "relative-gender",
                                  checked: relative.gender === "男",
                                  onChange: () => setRelative({ ...relative, gender: "男" }),
                                }),
                                " 男",
                              ],
                            }),
                            jsx.jsxs("label", {
                              children: [
                                jsx.jsx("input", {
                                  type: "radio",
                                  name: "relative-gender",
                                  checked: relative.gender === "女",
                                  onChange: () => setRelative({ ...relative, gender: "女" }),
                                }),
                                " 女",
                              ],
                            }),
                          ],
                        }),
                      }),
                      jsx.jsx(Field, {
                        label: "出生日期",
                        required: true,
                        children: jsx.jsx("input", {
                          type: "date",
                          value: relative.birth,
                          onChange: (event) =>
                            (setRelative({ ...relative, birth: event.target.value }), clearRelativeInvalid("birth")),
                          className: relativeInvalid.includes("birth") ? "input-error" : "",
                        }),
                      }),
                      jsx.jsx(Field, {
                        label: "證件類型",
                        required: true,
                        children: jsx.jsxs(Select, {
                          value: relative.docType,
                          onChange: (event) =>
                            (setRelative({ ...relative, docType: event.target.value }), clearRelativeInvalid("docType")),
                          className: relativeInvalid.includes("docType") ? "input-error" : "",
                          children: [
                            jsx.jsx("option", { children: "澳門居民身份證" }),
                            jsx.jsx("option", { children: "外地僱員身份認別證" }),
                            jsx.jsx("option", { children: "護照" }),
                          ],
                        }),
                      }),
                      jsx.jsx(Field, {
                        label: "證件號碼",
                        required: true,
                        children: jsx.jsx("input", {
                          value: relative.docNo,
                          onChange: (event) =>
                            (setRelative({ ...relative, docNo: event.target.value }), clearRelativeInvalid("docNo")),
                          className: relativeInvalid.includes("docNo") ? "input-error" : "",
                        }),
                      }),
                      jsx.jsx(Field, {
                        label: "親屬關係",
                        required: true,
                        wide: true,
                        children: jsx.jsxs("div", {
                          className: "radio-row",
                          children: ["配偶", "尊親屬", "卑親屬", "兄弟姊妹"].map((option) =>
                            jsx.jsxs(
                              "label",
                              {
                                children: [
                                  jsx.jsx("input", {
                                    type: "radio",
                                    name: "relative-relation",
                                    checked: relative.relation === option,
                                    onChange: () =>
                                      setRelative({ ...relative, relation: option }),
                                  }),
                                  " " + option,
                                ],
                              },
                              option,
                            ),
                          ),
                        }),
                      }),
                    ],
                  }),
                ],
              }),
              jsx.jsxs("div", {
                className: "form-actions",
                children: [
                  jsx.jsx(Button, { variant: "ghost", onClick: () => setStep(2), children: "上一步" }),
                  jsx.jsx(Button, { onClick: validateRelative, children: "下一步" }),
                ],
              }),
            ],
          })
        : step === 4 && isRelative
          ? jsx.jsxs("section", {
              className: "panel wizard-panel",
              children: [
                jsx.jsxs("div", {
                  className: "section-title",
                  children: [
                    jsx.jsx("h2", { children: "填寫親屬資料" }),
                    jsx.jsx("span", { children: "填寫申請資料" }),
                  ],
                }),
                jsx.jsx(WizardProgress, { current: wizardCurrent, steps: wizardSteps }),
                jsx.jsxs("div", {
                  className: "form-section",
                  children: [
                    jsx.jsx("h3", { children: "親屬個人資料" }),
                    jsx.jsxs("div", {
                      className: "form-grid cols-3",
                      children: [
                        jsx.jsx(Field, {
                          label: "職業",
                          required: true,
                          children: jsx.jsx("input", {
                            value: relative.occupation,
                            onChange: (event) =>
                              setRelative({ ...relative, occupation: event.target.value }),
                          }),
                        }),
                        jsx.jsx(Field, {
                          label: "電郵",
                          children: jsx.jsx("input", {
                            value: relative.email,
                            onChange: (event) =>
                              setRelative({ ...relative, email: event.target.value }),
                          }),
                        }),
                        jsx.jsx(Field, {
                          label: "聯絡手提電話",
                          required: true,
                          children: jsx.jsxs("div", {
                            className: "phone",
                            children: [
                              jsx.jsx(Select, {
                                value: relative.phoneCode,
                                onChange: (event) =>
                                  setRelative({ ...relative, phoneCode: event.target.value }),
                                children: ["+853", "+86", "+852"].map((phoneCode) =>
                                  jsx.jsx("option", { value: phoneCode, children: phoneCode }, phoneCode),
                                ),
                              }),
                              jsx.jsx("input", {
                                value: relative.phone,
                                onChange: (event) =>
                                  setRelative({ ...relative, phone: event.target.value }),
                              }),
                            ],
                          }),
                        }),
                        jsx.jsx(Field, {
                          label: "地址",
                          required: true,
                          wide: true,
                          children: jsx.jsx("input", {
                            value: relative.address,
                            onChange: (event) =>
                              setRelative({ ...relative, address: event.target.value }),
                          }),
                        }),
                      ],
                    }),
                  ],
                }),
                jsx.jsxs("div", {
                  className: "form-section",
                  children: [
                    jsx.jsx("h3", { children: "上傳親屬證件" }),
                    jsx.jsx(Field, {
                      label: "證件類型",
                      required: true,
                      children: jsx.jsx(Select, {
                        className: "doc-type",
                        value: relativeDocType,
                        onChange: (event) => setRelativeDocType(event.target.value),
                        children: [
                          "澳門居民身份證",
                          "外地僱員身份認別證",
                          "護照",
                        ].map((option) => jsx.jsx("option", { children: option }, option)),
                      }),
                    }),
                    jsx.jsxs("div", {
                      className: "upload-box",
                      children: [
                        jsx.jsx(Vd, { size: 26 }),
                        jsx.jsx("b", {
                          children: `拖曳「${relativeDocType}」掃描件至此，或點擊上傳`,
                        }),
                        jsx.jsx("input", {
                          type: "file",
                          onChange: (event) => {
                            event.target.files[0] &&
                              !relativeFiles.some((item) => item.name === event.target.files[0].name) &&
                              setRelativeFiles([
                                ...relativeFiles,
                                { type: relativeDocType, name: event.target.files[0].name },
                              ]);
                            event.target.value = "";
                          },
                        }),
                      ],
                    }),
                    jsx.jsx("div", {
                      className: "file-list",
                      children: relativeFiles.map((doc) =>
                        jsx.jsxs(
                          "span",
                          {
                            onClick: () => setPreviewFile({ name: doc.name, type: doc.type }),
                            children: [
                              jsx.jsx(W8, {}),
                              jsx.jsx("b", {
                                className: "file-type",
                                children: doc.type,
                              }),
                              doc.name,
                              jsx.jsx("button", {
                                onClick: (event) => {
                                  event.stopPropagation();
                                  setRelativeFiles(relativeFiles.filter((item) => item.name !== doc.name));
                                },
                                children: jsx.jsx(mf, {}),
                              }),
                            ],
                          },
                          doc.type + doc.name,
                        ),
                      ),
                    }),
                  ],
                }),
                jsx.jsxs("div", {
                  className: "form-actions",
                  children: [
                    jsx.jsx(Button, { variant: "ghost", onClick: () => setStep(3), children: "上一步" }),
                    jsx.jsx(Button, { onClick: () => setStep(5), children: "預覽" }),
                  ],
                }),
              ],
            })
      : jsx.jsxs("section", {
          className: "panel wizard-panel",
          children: [
            jsx.jsxs("div", {
              className: "section-title",
              children: [
                jsx.jsx("h2", {
                  children: mode === "terminate" ? "填寫廢止資料" : "填寫申請資料",
                }),
                jsx.jsx("span", {
                  children: "填寫申請資料",
                }),
              ],
            }),
            jsx.jsx(WizardProgress, { current: wizardCurrent, steps: wizardSteps }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", {
                  children:
                    partyType === "親屬申請" ? "被申請人個人資料" : "申請人個人資料",
                }),
                jsx.jsxs("div", {
                  className: "form-grid cols-3",
                  children: [
                    jsx.jsx(Field, {
                      label: "職業",
                      required: true,
                      children: jsx.jsx("input", {
                        value: personal.occupation,
                        onChange: (event) =>
                          setPersonal({ ...personal, occupation: event.target.value }),
                      }),
                    }),
                    jsx.jsx(Field, {
                      label: "電郵",
                      children: jsx.jsx("input", {
                        value: personal.email,
                        onChange: (event) =>
                          setPersonal({ ...personal, email: event.target.value }),
                      }),
                    }),
                    jsx.jsx(Field, {
                      label: "聯絡手提電話",
                      required: true,
                      children: jsx.jsxs("div", {
                        className: "phone",
                        children: [
                          jsx.jsx(Select, {
                            value: personal.phoneCode,
                            onChange: (event) =>
                              setPersonal({ ...personal, phoneCode: event.target.value }),
                            children: ["+853", "+86", "+852"].map((phoneCode) =>
                                  jsx.jsx("option", { value: phoneCode, children: phoneCode }, phoneCode),
                                ),
                          }),
                          jsx.jsx("input", {
                            value: personal.phone,
                            onChange: (event) =>
                              setPersonal({ ...personal, phone: event.target.value }),
                          }),
                        ],
                      }),
                    }),
                    jsx.jsx(Field, {
                      label: "地址",
                      required: true,
                      wide: true,
                      children: jsx.jsx("input", {
                        value: personal.address,
                        onChange: (event) =>
                          setPersonal({ ...personal, address: event.target.value }),
                      }),
                    }),
                  ],
                }),
              ],
            }),
            mode !== "terminate" &&
              jsx.jsxs(jsx.Fragment, {
                children: [
                  jsx.jsxs("div", {
                    className: "form-section",
                    children: [
                      jsx.jsx("h3", { children: "申請禁入之期限" }),
                      jsx.jsxs("div", {
                        className: "form-grid cols-3",
                        children: [
                          jsx.jsx(Field, {
                            label: "生效日",
                            required: true,
                            children: jsx.jsx("input", {
                              type: "date",
                              value: effectiveDate,
                              onChange: (event) => {
                                (setEffectiveDate(event.target.value),
                                  term && term !== "其他" && setEndDate(computeTermEndDate(term, event.target.value)),
                                  clearTermInvalid("effectiveDate"));
                              },
                              className: termInvalidFields.includes("effectiveDate") ? "input-error" : "",
                            }),
                          }),
                          jsx.jsx(Field, {
                            label: "期限",
                            children: jsx.jsx(Select, {
                              value: term,
                              onChange: (event) => {
                                (setTerm(event.target.value),
                                  termMonths[event.target.value] &&
                                    setEndDate(computeTermEndDate(event.target.value, effectiveDate)),
                                  clearTermInvalid("term"),
                                  clearTermInvalid("endDate"));
                              },
                              className:
                                termInvalidFields.includes("term")
                                  ? "input-error"
                                  : endDate && !term
                                    ? "term-muted"
                                    : "",
                              children: ["", "六個月", "一年", "十八個月", "兩年", "其他"].map((option) =>
                                jsx.jsx("option", { value: option, children: option || "請選擇期限" }, option || "placeholder"),
                              ),
                            }),
                          }),
                          jsx.jsx(Field, {
                            label: jsx.jsxs(jsx.Fragment, {
                              children: [
                                "廢止日",
                                term && term !== "其他" && jsx.jsx("span", { className: "field-tag", children: "自動計算" }),
                              ],
                            }),
                            children: jsx.jsx("input", {
                              type: "date",
                              value: endDate,
                              onChange: (event) => {
                                (setEndDate(event.target.value),
                                  event.target.value && setTerm(""),
                                  clearTermInvalid("endDate"),
                                  clearTermInvalid("term"));
                              },
                              className: termInvalidFields.includes("endDate") ? "input-error" : "",
                            }),
                          }),
                        ],
                      }),
                      termInvalidFields.length > 0 &&
                        jsx.jsx("div", {
                          className: "field-error",
                          children: termInvalidFields.includes("effectiveDate")
                            ? "請填寫生效日。"
                            : "請選擇期限或填寫廢止日（二選一）。",
                        }),
                    ],
                  }),
                  jsx.jsxs("div", {
                    className: "form-section",
                    children: [
                      jsx.jsx("h3", { children: "申請禁入之博彩承批公司" }),
                      jsx.jsxs("div", {
                        className: "radio-row",
                        children: [
                          jsx.jsxs("label", {
                            children: [
                              jsx.jsx("input", {
                                type: "radio",
                                checked: scope === "全部",
                                onChange: () => setScope("全部"),
                              }),
                              " 全部",
                            ],
                          }),
                          jsx.jsxs("label", {
                            children: [
                              jsx.jsx("input", {
                                type: "radio",
                                checked: scope !== "全部",
                                onChange: () => setScope("指定承批公司"),
                              }),
                              " 禁入除外的承批公司（可複選）",
                            ],
                          }),
                        ],
                      }),
                      scope !== "全部" &&
                        jsx.jsx("div", {
                          className: "check-grid",
                          children: [
                            "澳娛綜合度假股份有限公司",
                            "永利渡假村（澳門）股份有限公司",
                            "美高梅金殿超濠股份有限公司",
                            "新濠博亞（澳門）股份有限公司",
                            "銀河娛樂場股份有限公司",
                            "威尼斯人澳門股份有限公司",
                          ].map((option) =>
                            jsx.jsxs(
                              "label",
                              {
                                children: [
                                  jsx.jsx("input", {
                                    type: "checkbox",
                                    checked: companies.includes(option),
                                    onChange: () =>
                                      setCompanies(
                                        companies.includes(option)
                                          ? companies.filter((item) => item !== option)
                                          : [...companies, option],
                                      ),
                                  }),
                                  option,
                                ],
                              },
                              option,
                            ),
                          ),
                        }),
                    ],
                  }),
                  jsx.jsxs("div", {
                    className: "form-section",
                    children: [
                      jsx.jsx("h3", { children: "聲明及問卷" }),
                      jsx.jsxs("div", {
                        className: "inline-question",
                        children: [
                          jsx.jsx("b", { children: "輔導服務" }),
                          jsx.jsxs("label", {
                            children: [
                              jsx.jsx("input", {
                                type: "radio",
                                name: "counsel-service",
                                checked: counsel === "同意",
                                onChange: () => setCounsel("同意"),
                              }),
                              " 同意",
                            ],
                          }),
                          jsx.jsxs("label", {
                            children: [
                              jsx.jsx("input", {
                                type: "radio",
                                name: "counsel-service",
                                checked: counsel === "不同意",
                                onChange: () => setCounsel("不同意"),
                              }),
                              " 不同意",
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "知悉禁入申請服務途徑" }),
                jsx.jsx("div", {
                  className: "check-grid compact",
                  children: [
                    "朋友",
                    "家人",
                    "同事",
                    "博企",
                    "社會工作局",
                    "賭博輔導中心",
                    "宣傳資料",
                    "其他",
                  ].map((option) =>
                    jsx.jsxs(
                      "label",
                      {
                        children: [
                          jsx.jsx("input", {
                            type: "checkbox",
                            defaultChecked: option === "朋友",
                          }),
                          option,
                        ],
                      },
                      option,
                    ),
                  ),
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "上傳證件" }),
                jsx.jsx(Field, {
                  label: "證件類型",
                  required: true,
                  children: jsx.jsx(Select, {
                    className: "doc-type",
                    value: docType,
                    onChange: (event) => setDocType(event.target.value),
                    children: [
                      "澳門居民身份證",
                      "外地僱員身份認別證",
                      "護照"
                    ].map((option) => jsx.jsx("option", { children: option }, option)),
                  }),
                }),
                jsx.jsxs("div", {
                  className: "upload-box",
                  children: [
                    jsx.jsx(Vd, { size: 26 }),
                    jsx.jsx("b", {
                      children: `拖曳「${docType}」掃描件至此，或點擊上傳`,
                    }),
                    jsx.jsx("input", {
                      type: "file",
                      onChange: (event) => {
                        event.target.files[0] &&
                          !documents.some((item) => item.name === event.target.files[0].name) &&
                          setDocuments([
                            ...documents,
                            { type: docType, name: event.target.files[0].name },
                          ]);
                        event.target.value = "";
                      },
                    }),
                  ],
                }),
                jsx.jsx("div", {
                  className: "file-list",
                  children: documents.map((doc) =>
                    jsx.jsxs(
                      "span",
                      {
                        onClick: () => setPreviewFile({ name: doc.name, type: doc.type }),
                        children: [
                          jsx.jsx(W8, {}),
                          jsx.jsx("b", {
                            className: "file-type",
                            children: doc.type,
                          }),
                          doc.name,
                          jsx.jsx("button", {
                            onClick: (event) => {
                              event.stopPropagation();
                              setDocuments(documents.filter((item) => item.name !== doc.name));
                            },
                            children: jsx.jsx(mf, {}),
                          }),
                        ],
                      },
                      doc.type + doc.name,
                    ),
                  ),
                }),
              ],
            }),
            mode !== "terminate" &&
              jsx.jsxs("div", {
                className: "form-section",
                children: [
                  jsx.jsx("h3", { children: "上傳近照" }),
                  jsx.jsxs("div", {
                    className: "upload-box",
                    children: [
                      jsx.jsx(Nd, { size: 26 }),
                      jsx.jsx("b", { children: "拖曳近照至此，或點擊上傳" }),
                      jsx.jsx("input", {
                        type: "file",
                        accept: "image/*",
                        onChange: (event) => {
                          event.target.files[0] && setPhotoName(event.target.files[0].name);
                          event.target.value = "";
                        },
                      }),
                    ],
                  }),
                  photoName &&
                    jsx.jsx("div", {
                      className: "file-list",
                      children: jsx.jsxs(
                        "span",
                        {
                          onClick: () => setPreviewFile({ name: photoName }),
                          children: [
                            jsx.jsx(W8, {}),
                            photoName,
                            jsx.jsx("button", {
                              onClick: (event) => {
                                event.stopPropagation();
                                setPhotoName("");
                              },
                              children: jsx.jsx(mf, {}),
                            }),
                          ],
                        },
                        photoName,
                      ),
                    }),
                ],
              }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx(Button, {
                  variant: "ghost",
                  onClick: () => (mode === "terminate" ? onCancel() : setStep(1)),
                  children: "上一步",
                }),
                jsx.jsx(Button, {
                  onClick: () => {
                    if (mode !== "terminate") {
                      const missing = [];
                      if (!effectiveDate) missing.push("effectiveDate");
                      if (!term && !endDate) missing.push("term", "endDate");
                      if (missing.length) return setTermInvalidFields(missing);
                    }
                    setStep(3);
                  },
                  children: isRelative ? "下一步" : "預覽",
                }),
              ],
            }),
          ],
        });
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx("div", {
        className: "page-heading",
        children: jsx.jsxs("div", {
          children: [
            jsx.jsx("p", { className: "eyebrow", children: "臨櫃收件" }),
            jsx.jsx("h1", { children: mode === "terminate" ? "廢止申請" : "申請" }),
            jsx.jsx("p", {
              children:
                step === 1
                  ? "選擇申請方式。"
                  : step === previewStep
                    ? "核對申請資料並確認提交。"
                    : step === 3 && isRelative
                      ? "填寫親屬證件資料。"
                      : step === 4 && isRelative
                        ? "填寫親屬資料。"
                        : mode === "terminate"
                          ? "填寫廢止申請資料。"
                          : "填寫申請資料。",
            }),
            draftDecidedRef.current &&
              draftHasContent &&
              jsx.jsx("p", {
                className: "helper",
                children: "草稿已自動暫存，離開流程後可依證件類型與證件號碼恢復",
              }),
          ],
        }),
      }),
      content,
      draftPending &&
        jsx.jsx(Modal, {
          title: "恢復暫存草稿",
          onClose: dismissDraft,
          children: jsx.jsxs(jsx.Fragment, {
            children: [
              jsx.jsx("p", {
                className: "confirm-text",
                children: `偵測到「${applicant.docType} · ${docNo}」於 ${draftPending.savedAt} 暫存的申請草稿，是否恢復繼續填寫？`,
              }),
              jsx.jsxs("div", {
                className: "form-actions",
                children: [
                  jsx.jsx(Button, {
                    variant: "danger",
                    onClick: discardDraft,
                    children: "重新填寫",
                  }),
                  jsx.jsx(Button, {
                    onClick: () => applyDraft(draftPending),
                    children: "恢復草稿",
                  }),
                ],
              }),
            ],
          }),
        }),
      previewFile && jsx.jsx(FilePreview, { file: previewFile, onClose: () => setPreviewFile(null) }),
    ],
  });
}
function ApplicationPreviewScreen({ data: data, documents: documents, photoName: photoName, relativeFiles: relativeFiles, onBack: onBack, onSubmit: onSubmit, onPreviewFile: onPreviewFile }) {
  const steps =
    data.mode === "terminate"
      ? WizardSteps.terminate
      : data.party === "親屬申請"
        ? WizardSteps.relative
        : WizardSteps.intake;
  return jsx.jsxs("section", {
    className: "panel preview",
    children: [
      jsx.jsxs("div", {
        className: "section-title",
        children: [
          jsx.jsxs("div", {
            children: [
              jsx.jsx("h2", { children: "確認提交" }),
              jsx.jsx("p", { children: "請核對以下申請資料，確認無誤後提交。" }),
            ],
          }),
          jsx.jsx(Badge, { children: "待提交" }),
        ],
      }),
      jsx.jsx(WizardProgress, { current: steps.length, steps: steps }),
      jsx.jsxs("div", {
        className: "form-section",
        children: [
          jsx.jsx("h3", {
            children: data.party === "親屬申請" ? "被申請人證件資料" : "申請人證件資料",
          }),
          jsx.jsxs("div", {
            className: "summary-grid",
            children: [
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "姓名（中文）" }),
                  jsx.jsx("b", { children: data.name }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "姓名（外文）" }),
                  jsx.jsx("b", { children: data.en }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "性別" }),
                  jsx.jsx("b", { children: data.applicant.gender }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "出生日期" }),
                  jsx.jsx("b", { children: data.applicant.birth }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "證件類型" }),
                  jsx.jsx("b", { children: data.applicant.docType || "—" }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "證件號碼" }),
                  jsx.jsx("b", { children: data.doc || "—" }),
                ],
              }),
            ],
          }),
        ],
      }),
      jsx.jsxs("div", {
        className: "form-section",
        children: [
          jsx.jsx("h3", {
            children: data.party === "親屬申請" ? "被申請人個人資料" : "申請人個人資料",
          }),
          jsx.jsxs("div", {
            className: "summary-grid",
            children: [
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "職業" }),
                  jsx.jsx("b", { children: data.personal.occupation }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "電郵" }),
                  jsx.jsx("b", { children: data.personal.email }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "聯絡手提電話" }),
                  jsx.jsx("b", {
                    children: `${data.personal.phoneCode} ${data.personal.phone}`,
                  }),
                ],
              }),
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("span", { children: "地址" }),
                  jsx.jsx("b", { children: data.personal.address }),
                ],
              }),
            ],
          }),
        ],
      }),
      data.mode !== "terminate" &&
        jsx.jsxs(jsx.Fragment, {
          children: [
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "申請禁入之期限" }),
                jsx.jsxs("div", {
                  className: "summary-grid",
                  children: [
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "生效日" }),
                        jsx.jsx("b", { children: data.effectiveDate }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "期限" }),
                        jsx.jsx("b", { children: data.term || "—" }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "廢止日" }),
                        jsx.jsx("b", { children: data.endDate || "—" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "申請禁入之博彩承批公司" }),
                jsx.jsxs("div", {
                  className: "summary-grid",
                  children: [
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "禁入範圍" }),
                        jsx.jsx("b", {
                          children:
                            data.scope === "全部"
                              ? "全部承批公司"
                              : data.companies.length
                                ? data.companies.join("、")
                                : "未指定承批公司",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "聲明及問卷" }),
                jsx.jsxs("div", {
                  className: "summary-grid",
                  children: [
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "輔導服務" }),
                        jsx.jsx("b", { children: data.counsel }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      jsx.jsxs("div", {
        className: "form-section",
        children: [
          jsx.jsx("h3", { children: "上傳證件" }),
          jsx.jsx("div", {
            className: "file-list",
            children: documents.map((doc) =>
              jsx.jsxs(
                "span",
                {
                  onClick: () => onPreviewFile({ name: doc.name, type: doc.type }),
                  children: [
                    jsx.jsx(W8, {}),
                    jsx.jsx("b", { className: "file-type", children: doc.type }),
                    doc.name,
                  ],
                },
                doc.type + doc.name,
              ),
            ),
          }),
        ],
      }),
      data.mode !== "terminate" &&
        photoName &&
        jsx.jsxs("div", {
          className: "form-section",
          children: [
            jsx.jsx("h3", { children: "上傳近照" }),
            jsx.jsx("div", {
              className: "file-list",
              children: jsx.jsxs(
                "span",
                {
                  onClick: () => onPreviewFile({ name: photoName }),
                  children: [jsx.jsx(W8, {}), photoName],
                },
                photoName,
              ),
            }),
          ],
        }),
      data.party === "親屬申請" &&
        jsx.jsxs(jsx.Fragment, {
          children: [
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "親屬證件資料" }),
                jsx.jsxs("div", {
                  className: "summary-grid",
                  children: [
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "姓名（中文）" }),
                        jsx.jsx("b", { children: data.relative.name }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "姓名（外文）" }),
                        jsx.jsx("b", { children: data.relative.en }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "證件類型" }),
                        jsx.jsx("b", { children: data.relative.docType }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "證件號碼" }),
                        jsx.jsx("b", { children: data.relative.docNo }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "親屬個人資料" }),
                jsx.jsxs("div", {
                  className: "summary-grid",
                  children: [
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "親屬關係" }),
                        jsx.jsx("b", { children: data.relative.relation }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "親屬姓名" }),
                        jsx.jsx("b", { children: data.relative.name }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "性別" }),
                        jsx.jsx("b", { children: data.relative.gender }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "出生日期" }),
                        jsx.jsx("b", { children: data.relative.birth }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "職業" }),
                        jsx.jsx("b", { children: data.relative.occupation }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "電郵" }),
                        jsx.jsx("b", { children: data.relative.email }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "聯絡手提電話" }),
                        jsx.jsx("b", {
                          children: `${data.relative.phoneCode} ${data.relative.phone}`,
                        }),
                      ],
                    }),
                    jsx.jsxs("div", {
                      children: [
                        jsx.jsx("span", { children: "地址" }),
                        jsx.jsx("b", { children: data.relative.address }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-section",
              children: [
                jsx.jsx("h3", { children: "上傳親屬證件" }),
                jsx.jsx("div", {
                  className: "file-list",
                  children: relativeFiles.map((doc) =>
                    jsx.jsxs(
                      "span",
                      {
                        onClick: () => onPreviewFile({ name: doc.name, type: doc.type }),
                        children: [
                          jsx.jsx(W8, {}),
                          jsx.jsx("b", { className: "file-type", children: doc.type }),
                          doc.name,
                        ],
                      },
                      doc.type + doc.name,
                    ),
                  ),
                }),
              ],
            }),
          ],
        }),
      jsx.jsxs("div", {
        className: "form-actions",
        children: [
          jsx.jsx(Button, { variant: "ghost", onClick: onBack, children: "上一步" }),
          jsx.jsx(Button, { icon: Ed, onClick: onSubmit, children: "提交並列印申請表" }),
        ],
      }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：申請管理（列表與詳情）---- */
function ApplicationsListScreen({ rows: rows, onOpen: onOpen }) {
  const [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10);
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx("div", {
        className: "page-heading",
        children: jsx.jsxs("div", {
          children: [
            jsx.jsx("p", { className: "eyebrow", children: "案件處理" }),
            jsx.jsx("h1", { children: "申請管理" })
          ],
        }),
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsx(SearchFilters, {}),
          jsx.jsx(ApplicationsTable, {
            rows: rows,
            onOpen: onOpen,
            actionLabel: "查看",
            page: page,
            pageSize: pageSize,
          }),
          jsx.jsx(Pager, {
            total: rows.length,
            page: page,
            pageSize: pageSize,
            onPageChange: setPage,
            onPageSizeChange: (size) => (setPageSize(size), setPage(1)),
          }),
        ],
      }),
    ],
  });
}
function BuildApplicantDetails(application) {
  return {
    name: application.name || "",
    foreignName: "",
    gender: "",
    birthDate: "",
    docType: "",
    docNo: "",
    phone: "",
    email: "",
    address: "",
    ...(application.applicantDetails || {}),
  };
}
function ApplicationDetailScreen({ application: application, onBack: onBack, onTransition: onTransition, onUpdateApplicant: onUpdateApplicant, role: role }) {
  const [note, setNote] = React.useState(""),
    [toast, setToast] = React.useState(""),
    [isEditingApplicant, setIsEditingApplicant] = React.useState(false),
    [applicantDraft, setApplicantDraft] = React.useState(() => BuildApplicantDetails(application)),
    [confirmAction, setConfirmAction] = React.useState(null),
    [previewDoc, setPreviewDoc] = React.useState(null),
    [attachments, setAttachments] = React.useState([
      { name: "身份證.pdf", time: "2026-07-05 13:59" },
      { name: "近照.jpg", time: "2026-07-05 13:59" },
    ]),
    attachmentsInputRef = React.useRef(null),
    [viewAttachment, setViewAttachment] = React.useState(null),
    actions = getAvailableActions(application, role),
    mainActions = actions.filter((item) => item.section === "main"),
    documentActions = actions.filter((item) => item.section === "document"),
    notificationActions = actions.filter((item) => item.section === "notification"),
    applicantDetails = BuildApplicantDetails(application),
    canEditApplicant =
      (role === WorkflowRoles.COUNTER || role === WorkflowRoles.ADMIN) &&
      ["待處理", "待通知補件", "已通知補件", "退回"].includes(application.status),
    updateApplicantDraft = (field, value) =>
      setApplicantDraft({ ...applicantDraft, [field]: value }),
    cancelApplicantEdit = () => {
      (setApplicantDraft(BuildApplicantDetails(application)), setIsEditingApplicant(false));
    },
    saveApplicantDetails = () => {
      if (!applicantDraft.name.trim() || !applicantDraft.docType || !applicantDraft.docNo.trim()) {
        (setToast("請填寫姓名、證件類型及證件號碼"), setTimeout(() => setToast(""), 2600));
        return;
      }
      const savedDetails = {
        ...applicantDraft,
        name: applicantDraft.name.trim(),
        foreignName: applicantDraft.foreignName.trim(),
        docNo: applicantDraft.docNo.trim(),
        phone: applicantDraft.phone.trim(),
        email: applicantDraft.email.trim(),
        address: applicantDraft.address.trim(),
      };
      (onUpdateApplicant(savedDetails),
        setApplicantDraft(savedDetails),
        setIsEditingApplicant(false),
        setToast("申請人資料已更新"),
        setTimeout(() => setToast(""), 2600));
    },
    runAction = (action) => {
      try {
        const result = onTransition(action.id, note);
        (setToast(result.message), setNote(""), setTimeout(() => setToast(""), 2600));
      } catch (result) {
        (setToast(result.message || "操作未能完成"), setTimeout(() => setToast(""), 2600));
      }
    },
    history = application.history || [],
    buildDocumentHtml = (docType) =>
      `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${docType}</title><style>body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;color:#17324d;padding:40px}header{text-align:center;border-bottom:2px solid #123a63;padding-bottom:12px;margin-bottom:24px}h1{font-size:24px;color:#123a63;margin:0 0 4px}.sub{font-size:12px;color:#64748b}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}td{border:1px solid #cbd5e1;padding:8px 10px}td:first-child{width:160px;background:#f1f5f9}p{font-size:14px;line-height:1.8;color:#475569}footer{margin-top:48px;text-align:right;font-size:12px;color:#94a3b8}</style></head><body><header><h1>${docType}</h1><div class="sub">博彩監察協調局</div></header><table><tr><td>案件編號</td><td>${application.id}</td></tr><tr><td>申請人</td><td>${application.name}</td></tr><tr><td>申請類型</td><td>${application.type}</td></tr><tr><td>來源</td><td>${application.source}</td></tr><tr><td>申請時間</td><td>${application.time}</td></tr></table><p>本文件由系統自動生成，內容以最終批核版本為準。文件內容包括申請人資料、申請事項、審批意見及相關批示。</p><footer>文件預覽 · DICJ 內部系統</footer></body></html>`,
    buildPdfPlaceholder = (docType) =>
      jsx.jsxs("div", {
        className: "pdf-placeholder",
        children: [
          jsx.jsx("div", { className: "pdf-badge", children: "PDF" }),
          jsx.jsx("b", { children: docType }),
          jsx.jsx("small", { children: "模擬文件預覽 · 博彩監察協調局" }),
        ],
      }),
    downloadDocument = (docType) => {
      const blob = new Blob([buildDocumentHtml(docType)], { type: "text/html" }),
        link = document.createElement("a");
      ((link.href = URL.createObjectURL(blob)),
        (link.download = `${docType}_${application.id.replace(/\//g, "-")}.html`),
        link.click(),
        URL.revokeObjectURL(link.href));
    },
    printDocument = (docType) => {
      const frame = document.createElement("iframe");
      ((frame.style.position = "absolute"),
        (frame.style.width = "0"),
        (frame.style.height = "0"),
        (frame.style.border = "0"),
        document.body.appendChild(frame));
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      (frameDoc.open(), frameDoc.write(buildDocumentHtml(docType)), frameDoc.close());
      (frame.contentWindow.focus(), frame.contentWindow.print());
      setTimeout(() => document.body.removeChild(frame), 1000);
    },
    handleAttachmentsUpload = (event) => {
      const files = Array.from(event.target.files || []),
        now = new Date(),
        pad = (num) => String(num).padStart(2, "0"),
        time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setAttachments((prev) => {
        const next = [...prev];
        files.forEach((file) => {
          !next.some((item) => item.name === file.name) && next.push({ name: file.name, time });
        });
        return next;
      });
      event.target.value = "";
    };
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsxs("button", {
        className: "back-link",
        onClick: onBack,
        children: [jsx.jsx(G8, {}), " 返回申請列表"],
      }),
      jsx.jsxs("div", {
        className: "detail-grid",
        children: [
          jsx.jsxs("div", {
            className: "detail-main",
            children: [
              jsx.jsxs("section", {
                className: "panel",
                children: [
                  jsx.jsxs("div", {
                    className: "section-title",
                    children: [
                      jsx.jsxs("div", {
                        children: [
                          jsx.jsx("p", {
                            className: "eyebrow",
                            children: "申請概況",
                          }),
                          jsx.jsx("h1", { className: "case-id", children: application.id }),
                        ],
                      }),
                      jsx.jsx(Badge, { children: application.status }),
                    ],
                  }),
                  jsx.jsxs("div", {
                    className: "summary-grid",
                    children: [
                      jsx.jsxs("div", {
                        children: [
                          jsx.jsx("span", { children: "申請類型" }),
                          jsx.jsx("b", { children: application.type }),
                        ],
                      }),
                      jsx.jsxs("div", {
                        children: [
                          jsx.jsx("span", { children: "來源" }),
                          jsx.jsx("b", { children: application.source }),
                        ],
                      }),
                      jsx.jsxs("div", {
                        children: [
                          jsx.jsx("span", { children: "方式" }),
                          jsx.jsxs("b", { children: [application.party, "申請"] }),
                        ],
                      }),
                      jsx.jsxs("div", {
                        children: [
                          jsx.jsx("span", { children: "申請時間" }),
                          jsx.jsx("b", { children: application.time }),
                        ],
                      }),
                      jsx.jsxs("div", {
                        children: [
                          jsx.jsx("span", { children: "當前負責角色" }),
                          jsx.jsx("b", { children: getResponsibleRole(application) }),
                        ],
                      }),
                    ],
                  }),
                  jsx.jsx(ProcessTimeline, { application: application }),
                ],
              }),
              jsx.jsxs("section", {
                className: "panel",
                children: [
                  jsx.jsxs("div", {
                    className: "section-title",
                    children: [
                      jsx.jsx("h2", { children: "申請人資料" }),
                      canEditApplicant &&
                        !isEditingApplicant &&
                        jsx.jsx(Button, {
                          variant: "outline",
                          icon: T0,
                          onClick: () => {
                            (setApplicantDraft(BuildApplicantDetails(application)), setIsEditingApplicant(true));
                          },
                          children: "編輯",
                        }),
                    ],
                  }),
                  isEditingApplicant
                    ? jsx.jsxs(jsx.Fragment, {
                        children: [
                          jsx.jsxs("div", {
                            className: "form-grid cols-3 applicant-edit-grid",
                            children: [
                              jsx.jsx(Field, {
                                label: "姓名（中文）",
                                required: true,
                                children: jsx.jsx("input", {
                                  value: applicantDraft.name,
                                  onChange: (event) => updateApplicantDraft("name", event.target.value),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "姓名（外文）",
                                children: jsx.jsx("input", {
                                  value: applicantDraft.foreignName,
                                  onChange: (event) => updateApplicantDraft("foreignName", event.target.value),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "性別",
                                children: jsx.jsxs(Select, {
                                  value: applicantDraft.gender,
                                  onChange: (event) => updateApplicantDraft("gender", event.target.value),
                                  children: ["男", "女"].map((option) =>
                                    jsx.jsx("option", { value: option, children: option }, option),
                                  ),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "出生日期",
                                children: jsx.jsx("input", {
                                  type: "date",
                                  value: applicantDraft.birthDate,
                                  onChange: (event) => updateApplicantDraft("birthDate", event.target.value),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "證件類型",
                                required: true,
                                children: jsx.jsxs(Select, {
                                  value: applicantDraft.docType,
                                  onChange: (event) => updateApplicantDraft("docType", event.target.value),
                                  children: ["澳門居民身份證", "香港居民身份證", "護照"].map((option) =>
                                    jsx.jsx("option", { value: option, children: option }, option),
                                  ),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "證件號碼",
                                required: true,
                                children: jsx.jsx("input", {
                                  value: applicantDraft.docNo,
                                  onChange: (event) => updateApplicantDraft("docNo", event.target.value),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "聯絡電話",
                                children: jsx.jsx("input", {
                                  type: "tel",
                                  value: applicantDraft.phone,
                                  onChange: (event) => updateApplicantDraft("phone", event.target.value),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "電子郵件",
                                children: jsx.jsx("input", {
                                  type: "email",
                                  value: applicantDraft.email,
                                  onChange: (event) => updateApplicantDraft("email", event.target.value),
                                }),
                              }),
                              jsx.jsx(Field, {
                                label: "地址",
                                wide: true,
                                children: jsx.jsx("input", {
                                  value: applicantDraft.address,
                                  onChange: (event) => updateApplicantDraft("address", event.target.value),
                                }),
                              }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            className: "form-actions applicant-edit-actions",
                            children: [
                              jsx.jsx(Button, { variant: "ghost", onClick: cancelApplicantEdit, children: "取消" }),
                              jsx.jsx(Button, { onClick: saveApplicantDetails, children: "儲存" }),
                            ],
                          }),
                        ],
                      })
                    : jsx.jsxs("div", {
                        className: "summary-grid",
                        children: [
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "姓名（中文）" }),
                              jsx.jsx("b", { children: applicantDetails.name }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "姓名（外文）" }),
                              jsx.jsx("b", { children: applicantDetails.foreignName || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "性別" }),
                              jsx.jsx("b", { children: applicantDetails.gender || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "出生日期" }),
                              jsx.jsx("b", { children: applicantDetails.birthDate || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "證件類型" }),
                              jsx.jsx("b", { children: applicantDetails.docType || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "證件號碼" }),
                              jsx.jsx("b", { children: applicantDetails.docNo || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "聯絡電話" }),
                              jsx.jsx("b", { children: applicantDetails.phone || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "電子郵件" }),
                              jsx.jsx("b", { children: applicantDetails.email || "—" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            className: "span-2",
                            children: [
                              jsx.jsx("span", { children: "地址" }),
                              jsx.jsx("b", { children: applicantDetails.address || "—" }),
                            ],
                          }),
                        ],
                      }),
                  jsx.jsxs("div", {
                    className: "panel-subsection",
                    children: [
                      jsx.jsx("div", {
                        className: "section-title",
                        children: jsx.jsx("h2", { children: "期限、通知與聲明" }),
                      }),
                      jsx.jsxs("div", {
                        className: "summary-grid",
                        children: [
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "生效日" }),
                              jsx.jsx("b", { children: "2026-07-08" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "廢止日" }),
                              jsx.jsx("b", { children: "2027-07-08" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "禁入之承批公司" }),
                              jsx.jsx("b", { children: "全部" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "取件方式" }),
                              jsx.jsx("b", { children: "親臨" }),
                            ],
                          }),
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("span", { children: "輔導服務" }),
                              jsx.jsx("b", { children: "同意" }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              jsx.jsxs("section", {
                className: "panel",
                children: [
                  jsx.jsxs("div", {
                    className: "section-title",
                    children: [
                      jsx.jsx("h2", { children: "附件" }),
                      jsx.jsx(Button, {
                        variant: "outline",
                        icon: F8,
                        onClick: () => attachmentsInputRef.current && attachmentsInputRef.current.click(),
                        children: "上傳",
                      }),
                      jsx.jsx("input", {
                        ref: attachmentsInputRef,
                        type: "file",
                        multiple: true,
                        style: { display: "none" },
                        onChange: handleAttachmentsUpload,
                      }),
                    ],
                  }),
                  jsx.jsxs("table", {
                    children: [
                      jsx.jsx("thead", {
                        children: jsx.jsxs("tr", {
                          children: [
                            jsx.jsx("th", { children: "文件" }),
                            jsx.jsx("th", { children: "建立時間" }),
                            jsx.jsx("th", { children: "操作" }),
                          ],
                        }),
                      }),
                      jsx.jsx("tbody", {
                        children: attachments.map((item) =>
                          jsx.jsxs(
                            "tr",
                            {
                              children: [
                                jsx.jsx("td", {
                                  className: "strong",
                                  children: item.name,
                                }),
                                jsx.jsx("td", { children: item.time }),
                                jsx.jsx("td", {
                                  children: jsx.jsx(Button, {
                                    variant: "outline",
                                    onClick: () => setViewAttachment(item),
                                    children: "查看",
                                  }),
                                }),
                              ],
                            },
                            item.name,
                          ),
                        ),
                      }),
                    ],
                  }),
                ],
              }),
              jsx.jsxs("section", {
                className: "panel action-panel",
                children: [
                  jsx.jsx("h2", { children: "案件處理" }),
                  actions.length > 0
                    ? jsx.jsxs(jsx.Fragment, {
                        children: [
                          jsx.jsx("textarea", {
                            value: note,
                            onChange: (event) => setNote(event.target.value),
                            placeholder: "可輸入處理意見，操作後會寫入紀錄",
                          }),
                          mainActions.length > 0
                            ? jsx.jsx("div", {
                                className: "form-actions",
                                children: jsx.jsx("div", {
                                  className: "button-row",
                                  children: mainActions.map((item) =>
                                    jsx.jsx(
                                      Button,
                                      {
                                        variant: item.variant || "primary",
                                        onClick: () => (item.id === "void_case" ? setConfirmAction(item) : runAction(item)),
                                        children: item.label,
                                      },
                                      item.id,
                                    ),
                                  ),
                                }),
                              })
                            : jsx.jsx("div", {
                                className: "readonly-note",
                                children: "此階段的可用操作位於右側文件或通知區。",
                              }),
                        ],
                      })
                    : jsx.jsx("div", {
                        className: "readonly-note",
                        children:
                          role === WorkflowRoles.ADMIN
                            ? "案件已結束，沒有可執行的操作。"
                            : `目前沒有屬於${role}的可執行操作。`,
                      }),
                ],
              }),
            ],
          }),
          jsx.jsxs("aside", {
            className: "detail-side",
            children: [
              jsx.jsxs("section", {
                className: "panel",
                children: [
                  jsx.jsx("h2", { children: "操作紀錄" }),
                  jsx.jsx("div", {
                    className: "timeline",
                    children: history.map((item, index) =>
                      jsx.jsxs(
                        "div",
                        {
                          children: [
                            jsx.jsx("i", {}),
                            jsx.jsx("b", {
                              children: item.actorRole
                                ? `${item.actorRole} · ${item.action}`
                                : item.title || item.action,
                            }),
                            jsx.jsx("span", { children: item.time }),
                            item.fromStatus &&
                              jsx.jsx("em", {
                                children:
                                  item.fromStatus === item.toStatus
                                    ? `狀態維持：${item.toStatus}`
                                    : `${item.fromStatus} → ${item.toStatus}`,
                              }),
                            item.note && jsx.jsx("em", { children: item.note }),
                          ],
                        },
                        index,
                      ),
                    ),
                  }),
                ],
              }),
              jsx.jsxs("section", {
                className: "panel",
                children: [
                  jsx.jsx("h2", { children: "列印文件" }),
                  ["申請表", "公函", "通知書", "批示"].map((item, index) =>
                    jsx.jsxs(
                      "div",
                      {
                        className: "document-row",
                        children: [
                          jsx.jsxs("div", {
                            children: [
                              jsx.jsx("b", { children: item }),
                              jsx.jsx("small", {
                                children: (application.flags || {}).documentsPrinted
                                  ? "已列印"
                                  : application.status === "已審批" || application.status === "已通知取件" || application.status === "完成"
                                    ? application.source === "一戶通"
                                      ? "已簽署"
                                      : "已簽署，待列印"
                                    : index === 0
                                      ? "已建立"
                                      : "未簽署",
                              }),
                            ],
                          }),
                          jsx.jsx(Button, {
                            variant: "outline",
                            icon: Na,
                            onClick: () => setPreviewDoc(item),
                            children: "預覽",
                          }),
                        ],
                      },
                      item,
                    ),
                  ),
                  documentActions.map((item) =>
                    jsx.jsx(
                      Button,
                      {
                        variant: "outline",
                        icon: Hd,
                        onClick: () => runAction(item),
                        children: item.label,
                      },
                      item.id,
                    ),
                  ),
                ],
              }),
              jsx.jsxs("section", {
                className: "panel",
                children: [
                  jsx.jsx("h2", { children: "通知及簽收" }),
                  notificationActions.length > 0
                    ? notificationActions.map((item) =>
                        jsx.jsx(
                          Button,
                          {
                            variant: item.variant || "primary",
                            icon: item.id.includes("notice") ? B8 : z0,
                            onClick: () => runAction(item),
                            children: item.label,
                          },
                          item.id,
                        ),
                      )
                    : jsx.jsx("div", {
                        className: "readonly-note",
                        children: "目前沒有可執行的通知或簽收操作。",
                      }),
                ],
              }),
            ],
          }),
        ],
      }),
      toast && jsx.jsxs("div", { className: "toast", children: [jsx.jsx(z0, {}), toast] }),
      confirmAction &&
        jsx.jsx(Modal, {
          title: "作廢案件",
          onClose: () => setConfirmAction(null),
          children: jsx.jsxs(jsx.Fragment, {
            children: [
              jsx.jsx("p", {
                className: "confirm-text",
                children: "此操作不可撤銷，作廢後案件流程將終止。確定要作廢此案件嗎？",
              }),
              jsx.jsxs("div", {
                className: "form-actions",
                children: [
                  jsx.jsx(Button, { variant: "ghost", onClick: () => setConfirmAction(null), children: "取消" }),
                  jsx.jsx(Button, {
                    variant: "danger",
                    onClick: () => {
                      (runAction(confirmAction), setConfirmAction(null));
                    },
                    children: "確認作廢",
                  }),
                ],
              }),
            ],
          }),
        }),
      previewDoc &&
        jsx.jsx(Modal, {
          title: `預覽 ${previewDoc}`,
          onClose: () => setPreviewDoc(null),
          children: [
            buildPdfPlaceholder(previewDoc),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx("span", {}),
                jsx.jsx(Button, {
                  variant: "outline",
                  icon: Hd,
                  onClick: () => printDocument(previewDoc),
                  children: "打印",
                }),
                jsx.jsx(Button, {
                  icon: bd,
                  onClick: () => downloadDocument(previewDoc),
                  children: "下載",
                }),
              ],
            }),
          ],
        }),
      viewAttachment &&
        jsx.jsx(Modal, {
          title: `預覽 ${viewAttachment.name}`,
          onClose: () => setViewAttachment(null),
          children: [
            jsx.jsxs("div", {
              style: { textAlign: "center", padding: "32px 0" },
              children: [
                /\.(jpg|jpeg|png|gif|webp)$/i.test(viewAttachment.name)
                  ? jsx.jsx(Nd, { size: 120, style: { color: "var(--text-muted)", opacity: 0.4 } })
                  : jsx.jsx(W8, { size: 120, style: { color: "var(--text-muted)", opacity: 0.4 } }),
                jsx.jsx("p", {
                  style: { marginTop: 16, fontSize: 14, color: "var(--text-secondary)" },
                  children: viewAttachment.name,
                }),
                jsx.jsx("p", {
                  style: { marginTop: 8, fontSize: 12, color: "var(--text-muted)" },
                  children: "（演示預覽）",
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx(Button, {
                  variant: "danger",
                  icon: Ec,
                  onClick: () => {
                    setAttachments((prev) => prev.filter((item) => item.name !== viewAttachment.name));
                    setViewAttachment(null);
                  },
                  children: "刪除",
                }),
                jsx.jsx("span", {}),
              ],
            }),
          ],
        }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：報表及查詢 ---- */
function ReportsScreen() {
  const reports = DemoData.reports,
    downloadReport = (reportName) => {
      const csvContent = `報表名稱,建立時間
${reportName},2026-08-27 10:30`,
        blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv" }),
        link = document.createElement("a");
      ((link.href = URL.createObjectURL(blob)),
        (link.download = `${reportName}.csv`),
        link.click(),
        URL.revokeObjectURL(link.href));
    };
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx("div", {
        className: "page-heading",
        children: jsx.jsxs("div", {
          children: [
            jsx.jsx("p", { className: "eyebrow", children: "數據中心" }),
            jsx.jsx("h1", { children: "報表及查詢" }),
            jsx.jsx("p", { children: "按日期產生及下載業務統計。" }),
          ],
        }),
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "filters",
            children: [
              jsx.jsx(Field, {
                label: "日期範圍",
                children: jsx.jsx("input", {
                  type: "date",
                  defaultValue: "2026-08-01",
                }),
              }),
              jsx.jsx(Field, {
                label: "至",
                children: jsx.jsx("input", {
                  type: "date",
                  defaultValue: "2026-08-27",
                }),
              }),
              jsx.jsx(Button, { icon: Na, children: "查詢" }),
            ],
          }),
          jsx.jsxs("table", {
            children: [
              jsx.jsx("thead", {
                children: jsx.jsxs("tr", {
                  children: [
                    jsx.jsx("th", { children: "名稱" }),
                    jsx.jsx("th", { children: "建立時間" }),
                    jsx.jsx("th", { children: "格式" }),
                    jsx.jsx("th", { children: "操作" }),
                  ],
                }),
              }),
              jsx.jsx("tbody", {
                children: reports.map((reportName) =>
                  jsx.jsxs(
                    "tr",
                    {
                      children: [
                        jsx.jsx("td", { className: "strong", children: reportName }),
                        jsx.jsx("td", { children: "2026-08-27 10:30" }),
                        jsx.jsx("td", { children: "CSV / Excel" }),
                        jsx.jsx("td", {
                          children: jsx.jsx(Button, {
                            variant: "outline",
                            icon: bd,
                            onClick: () => downloadReport(reportName),
                            children: "下載",
                          }),
                        }),
                      ],
                    },
                    reportName,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：行政處罰名單 ---- */
function SanctionsScreen() {
  const [rows, setRows] = React.useState(DemoData.sanctions),
    [isModalOpen, setModalOpen] = React.useState(false),
    [toast, setToast] = React.useState(""),
    [sort, setSort] = React.useState({ key: null, direction: "asc" }),
    [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10),
    onSort = (nextSort) => setSort(nextSort),
    sortedRows = React.useMemo(
      () =>
        sortRowsForDisplay(rows, sort, {
          zh: (record) => record.zh,
          en: (record) => record.en,
          doc: (record) => record.doc,
          no: (record) => record.no,
          scope: (record) => record.scope,
          start: (record) => record.start,
          end: (record) => record.end,
        }),
      [rows, sort],
    ),
    totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize)),
    currentPage = Math.min(Math.max(1, page), totalPages),
    pagedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    addRecord = () => {
      (setRows([
        {
          zh: "新建紀錄",
          en: "NEW RECORD",
          doc: "澳門居民身份證",
          no: "1000000(0)",
          scope: "全部",
          start: "2026-08-27",
          end: "2027-08-27",
        },
        ...rows,
      ]),
        setModalOpen(false),
        setToast("行政處罰紀錄已新增"),
        setTimeout(() => setToast(""), 2200));
    };
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsxs("div", {
        className: "page-heading",
        children: [
          jsx.jsxs("div", {
            children: [
              jsx.jsx("p", { className: "eyebrow", children: "名單管理" }),
              jsx.jsx("h1", { children: "行政處罰名單" }),
              jsx.jsx("p", { children: "管理行政處罰所產生的娛樂場禁入紀錄。" }),
            ],
          }),
          jsx.jsxs("div", {
            className: "button-row",
            children: [
              jsx.jsx(Button, {
                variant: "outline",
                icon: Sd,
                onClick: () => setToast("模擬匯入完成：成功 8 筆，重複 1 筆"),
                children: "匯入資料",
              }),
              jsx.jsx(Button, {
                icon: Wn,
                onClick: () => setModalOpen(true),
                children: "新增資料",
              }),
            ],
          }),
        ],
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "filters",
            children: [
              jsx.jsx(Field, { label: "姓名", children: jsx.jsx("input", {}) }),
              jsx.jsx(Field, {
                label: "證件類型",
                children: jsx.jsx(Select, {
                  value: "全部",
                  children: jsx.jsx("option", { children: "全部" }),
                }),
              }),
              jsx.jsx(Field, { label: "證件號碼", children: jsx.jsx("input", {}) }),
              jsx.jsx(Field, {
                label: "範圍",
                children: jsx.jsx(Select, {
                  value: "全部",
                  children: jsx.jsx("option", { children: "全部" }),
                }),
              }),
              jsx.jsx(Button, { icon: Na, children: "查詢" }),
            ],
          }),
          jsx.jsx("div", {
            className: "table-wrap",
            children: jsx.jsxs("table", {
              children: [
                jsx.jsx("thead", {
                  children: jsx.jsxs("tr", {
                    children: [
                      jsx.jsx(SortableTh, { label: "姓名（中文）", sortKey: "zh", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "姓名（外文）", sortKey: "en", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "證件類型", sortKey: "doc", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "證件編號", sortKey: "no", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "禁入範圍", sortKey: "scope", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "生效時間", sortKey: "start", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "廢止時間", sortKey: "end", sort: sort, onSort: onSort }),
                      jsx.jsx("th", { children: "操作" }),
                    ],
                  }),
                }),
                jsx.jsx("tbody", {
                  children: pagedRows.map((record) =>
                    jsx.jsxs(
                      "tr",
                      {
                        children: [
                          jsx.jsx("td", { className: "strong", children: record.zh }),
                          jsx.jsx("td", { children: record.en }),
                          jsx.jsx("td", { children: record.doc }),
                          jsx.jsx("td", { children: record.no }),
                          jsx.jsx("td", { children: record.scope }),
                          jsx.jsx("td", { children: record.start }),
                          jsx.jsx("td", { children: record.end }),
                          jsx.jsx("td", {
                            children: jsx.jsxs("div", {
                              className: "icon-actions",
                              children: [
                                jsx.jsx("button", {
                                  "aria-label": "編輯",
                                  children: jsx.jsx(T0, {}),
                                }),
                                jsx.jsx("button", {
                                  className: "danger-icon",
                                  "aria-label": "刪除",
                                  onClick: () => setRows(rows.filter((item) => item.no !== record.no)),
                                  children: jsx.jsx(Ec, {}),
                                }),
                              ],
                            }),
                          }),
                        ],
                      },
                      record.no,
                    ),
                  ),
                }),
              ],
            }),
          }),
          jsx.jsx(Pager, {
            total: sortedRows.length,
            page: page,
            pageSize: pageSize,
            onPageChange: setPage,
            onPageSizeChange: (size) => (setPageSize(size), setPage(1)),
          }),
        ],
      }),
      isModalOpen &&
        jsx.jsxs(Modal, {
          title: "新增行政處罰資料",
          onClose: () => setModalOpen(false),
          children: [
            jsx.jsxs("div", {
              className: "form-grid",
              children: [
                jsx.jsx(Field, {
                  label: "姓名（中文）",
                  required: true,
                  children: jsx.jsx("input", {}),
                }),
                jsx.jsx(Field, {
                  label: "姓名（外文）",
                  required: true,
                  children: jsx.jsx("input", {}),
                }),
                jsx.jsx(Field, {
                  label: "證件類型",
                  required: true,
                  children: jsx.jsx(Select, {
                    value: "澳門居民身份證",
                    children: jsx.jsx("option", { children: "澳門居民身份證" }),
                  }),
                }),
                jsx.jsx(Field, {
                  label: "證件號碼",
                  required: true,
                  children: jsx.jsx("input", {}),
                }),
                jsx.jsx(Field, {
                  label: "起訖日期",
                  required: true,
                  children: jsx.jsx("input", { type: "date" }),
                }),
                jsx.jsx(Field, {
                  label: "到期日",
                  required: true,
                  children: jsx.jsx("input", { type: "date" }),
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx("span", {}),
                jsx.jsx(Button, { onClick: addRecord, children: "儲存" }),
              ],
            }),
          ],
        }),
      toast && jsx.jsxs("div", { className: "toast", children: [jsx.jsx(z0, {}), toast] }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：內容模板管理 ---- */
function TemplatesScreen() {
  const [templates, setTemplates] = React.useState(DemoData.templates),
    [editing, setEditing] = React.useState(null),
    [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10),
    totalPages = Math.max(1, Math.ceil(templates.length / pageSize)),
    currentPage = Math.min(Math.max(1, page), totalPages),
    pagedTemplates = templates
      .map((template, index) => ({ template: template, index: index }))
      .slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx(PageHeader, {
        eyebrow: "內容設定",
        title: "內容模板管理",
        desc: "管理案件通知所使用的電子通知與短信內容。",
        action: jsx.jsx(Button, {
          icon: Wn,
          onClick: () =>
            setEditing({ name: "", type: "電子通知", content: "", active: true }),
          children: "新增模板",
        }),
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "filters",
            children: [
              jsx.jsx(Field, { label: "名稱", children: jsx.jsx("input", {}) }),
              jsx.jsx(Field, {
                label: "類別",
                children: jsx.jsxs(Select, {
                  value: "全部",
                  children: [
                    jsx.jsx("option", { children: "全部" }),
                    jsx.jsx("option", { children: "電子通知" }),
                    jsx.jsx("option", { children: "短信" }),
                  ],
                }),
              }),
              jsx.jsx(Button, { icon: Na, children: "查詢" }),
            ],
          }),
          jsx.jsxs("table", {
            children: [
              jsx.jsx("thead", {
                children: jsx.jsxs("tr", {
                  children: [
                    jsx.jsx("th", { children: "名稱" }),
                    jsx.jsx("th", { children: "類別" }),
                    jsx.jsx("th", { children: "內容" }),
                    jsx.jsx("th", { children: "狀態" }),
                    jsx.jsx("th", { children: "更新時間" }),
                    jsx.jsx("th", { children: "操作" }),
                  ],
                }),
              }),
              jsx.jsx("tbody", {
                children: pagedTemplates.map(({ template: template, index: index }) =>
                  jsx.jsxs(
                    "tr",
                    {
                      children: [
                        jsx.jsx("td", { className: "strong", children: template.name }),
                        jsx.jsx("td", { children: template.type }),
                        jsx.jsx("td", {
                          className: "truncate",
                          children: template.content,
                        }),
                        jsx.jsx("td", {
                          children: jsx.jsx(Badge, {
                            children: template.active ? "啟用" : "停用",
                          }),
                        }),
                        jsx.jsx("td", { children: "2026-08-27 09:40" }),
                        jsx.jsx("td", {
                          children: jsx.jsxs("div", {
                            className: "icon-actions",
                            children: [
                              jsx.jsx("button", {
                                onClick: () => setEditing({ ...template, index: index }),
                                children: jsx.jsx(T0, {}),
                              }),
                              jsx.jsx("button", {
                                className: "danger-icon",
                                onClick: () => setTemplates(templates.filter((item, i) => i !== index)),
                                children: jsx.jsx(Ec, {}),
                              }),
                            ],
                          }),
                        }),
                      ],
                    },
                    template.name,
                  ),
                ),
              }),
            ],
          }),
          jsx.jsx(Pager, {
            total: templates.length,
            page: page,
            pageSize: pageSize,
            onPageChange: setPage,
            onPageSizeChange: (size) => (setPageSize(size), setPage(1)),
          }),
        ],
      }),
      editing &&
        jsx.jsxs(Modal, {
          title: editing.index === undefined ? "新增模板" : "編輯模板",
          onClose: () => setEditing(null),
          children: [
            jsx.jsxs("div", {
              className: "form-grid",
              children: [
                jsx.jsx(Field, {
                  label: "名稱",
                  children: jsx.jsx("input", {
                    value: editing.name,
                    onChange: (event) => setEditing({ ...editing, name: event.target.value }),
                  }),
                }),
                jsx.jsx(Field, {
                  label: "類別",
                  children: jsx.jsxs(Select, {
                    value: editing.type,
                    onChange: (event) => setEditing({ ...editing, type: event.target.value }),
                    children: [
                      jsx.jsx("option", { children: "電子通知" }),
                      jsx.jsx("option", { children: "短信" }),
                    ],
                  }),
                }),
                jsx.jsx(Field, {
                  label: "狀態",
                  children: jsx.jsxs(Select, {
                    value: editing.active ? "啟用" : "停用",
                    onChange: (event) =>
                      setEditing({ ...editing, active: event.target.value === "啟用" }),
                    children: [
                      jsx.jsx("option", { children: "啟用" }),
                      jsx.jsx("option", { children: "停用" }),
                    ],
                  }),
                }),
                jsx.jsx(Field, {
                  label: "內容",
                  wide: true,
                  children: jsx.jsx("textarea", {
                    value: editing.content,
                    onChange: (event) => setEditing({ ...editing, content: event.target.value }),
                  }),
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "helper",
              children: [
                "可用變數：",
                "{{申請人姓名}}、{{禁入編號}}、{{到期日}}",
              ],
            }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx("span", {}),
                jsx.jsx(Button, {
                  onClick: () => {
                    (editing.index === undefined
                      ? setTemplates([...templates, { ...editing, name: editing.name || "新通知模板" }])
                      : setTemplates(templates.map((template, index) => (index === editing.index ? editing : template))),
                      setEditing(null));
                  },
                  children: "儲存",
                }),
              ],
            }),
          ],
        }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：公眾假期管理 ---- */
function HolidaysScreen() {
  const [rows, setRows] = React.useState(DemoData.holidays),
    [toast, setToast] = React.useState(""),
    [editing, setEditing] = React.useState(null),
    [sort, setSort] = React.useState({ key: null, direction: "asc" }),
    onSort = (nextSort) => setSort(nextSort),
    fileInputRef = React.useRef(null),
    showToast = (message) => (setToast(message), setTimeout(() => setToast(""), 2600)),
    sortRows = (list) =>
      [...list].sort((a, b) =>
        a.date === b.date ? a.name.localeCompare(b.name, "zh-Hant") : a.date < b.date ? -1 : 1,
      ),
    holidayKey = (row) => `${row.name}|${row.date}`,
    handleImport = (event) => {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imported = parseICS(String(reader.result));
        if (!imported.length) return showToast("匯入失敗：檔案中沒有可匯入的假期事件");
        const existingKeys = new Set(rows.map((row) => holidayKey(row))),
          fresh = imported.filter((item) => !existingKeys.has(holidayKey(item)));
        fresh.length && setRows(sortRows([...rows, ...fresh]));
        showToast(`匯入完成：成功 ${fresh.length} 筆，重複 ${imported.length - fresh.length} 筆`);
      };
      reader.readAsText(file, "UTF-8");
    },
    removeRow = (key) =>
      (setRows((prev) => prev.filter((item) => holidayKey(item) !== key)), showToast("假期資料已刪除"));
  const saveEdit = () => {
    const name = (editing.name || "").trim() || "未命名假期",
      dateStart = editing.date || "",
      savedDate =
        editing.rangeEnd && dateStart && dateStart < editing.rangeEnd
          ? `${dateStart} 至 ${editing.rangeEnd}`
          : dateStart;
    if (!dateStart) return showToast("請填寫假期日期");
    if (rows.some((row) => holidayKey(row) !== editing.key && row.name === name && row.date === savedDate))
      return showToast("已存在名稱與日期相同的假期資料");
    (setRows(
      sortRows(
        rows.map((row) =>
          holidayKey(row) === editing.key ? { name: name, date: savedDate, created: editing.created } : row,
        ),
      ),
    ),
      setEditing(null),
      showToast("假期資料已更新"));
  };
  const sortedRows = React.useMemo(
    () =>
      sortRowsForDisplay(rows, sort, {
        year: (row) => row.date.slice(0, 4),
        name: (row) => row.name,
        date: (row) => row.date,
        created: (row) => row.created,
      }),
    [rows, sort],
  );
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx(PageHeader, {
        eyebrow: "系統設定",
        title: "公眾假期管理",
        desc: "匯入 ICS 日曆檔以維護本局公眾假期資料。",
        action: jsx.jsx(Button, {
          icon: Sd,
          onClick: () => fileInputRef.current && fileInputRef.current.click(),
          children: "匯入 ICS",
        }),
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsx("div", {
            className: "table-wrap",
            children: jsx.jsxs("table", {
              children: [
                jsx.jsx("thead", {
                  children: jsx.jsxs("tr", {
                    children: [
                      jsx.jsx(SortableTh, { label: "年度", sortKey: "year", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "假期名稱", sortKey: "name", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "假期日期", sortKey: "date", sort: sort, onSort: onSort }),
                      jsx.jsx(SortableTh, { label: "創建時間", sortKey: "created", sort: sort, onSort: onSort }),
                      jsx.jsx("th", { children: "操作" }),
                    ],
                  }),
                }),
                jsx.jsx("tbody", {
                  children:
                    rows.length === 0
                      ? jsx.jsx(TableEmptyState, { cols: 5 })
                      : sortedRows.map((row) =>
                          jsx.jsxs(
                            "tr",
                            {
                              children: [
                                jsx.jsx("td", { children: row.date.slice(0, 4) }),
                                jsx.jsx("td", { className: "strong", children: row.name }),
                                jsx.jsx("td", { children: row.date }),
                                jsx.jsx("td", { children: row.created }),
                                jsx.jsx("td", {
                                  children: jsx.jsxs("div", {
                                    className: "icon-actions",
                                    children: [
                                      jsx.jsx("button", {
                                        "aria-label": "編輯",
                                        onClick: () =>
                                          setEditing({
                                            name: row.name,
                                            date: row.date.slice(0, 10),
                                            created: row.created,
                                            key: holidayKey(row),
                                            rangeEnd: row.date.includes(" 至 ") ? row.date.slice(row.date.indexOf(" 至 ") + 3) : "",
                                          }),
                                        children: jsx.jsx(T0, {}),
                                      }),
                                      jsx.jsx("button", {
                                        className: "danger-icon",
                                        "aria-label": "刪除",
                                        onClick: () => removeRow(holidayKey(row)),
                                        children: jsx.jsx(Ec, {}),
                                      }),
                                    ],
                                  }),
                                }),
                              ],
                            },
                            `${row.name}-${row.date}`,
                          ),
                        ),
                }),
              ],
            }),
          }),
        ],
      }),
      jsx.jsx("input", {
        ref: fileInputRef,
        type: "file",
        accept: ".ics,text/calendar",
        style: { display: "none" },
        onChange: handleImport,
      }),
      editing &&
        jsx.jsxs(Modal, {
          title: "編輯公眾假期",
          onClose: () => setEditing(null),
          children: [
            jsx.jsxs("div", {
              className: "form-grid",
              children: [
                jsx.jsx(Field, {
                  label: "假期名稱",
                  required: true,
                  children: jsx.jsx("input", {
                    value: editing.name,
                    onChange: (event) => setEditing({ ...editing, name: event.target.value }),
                  }),
                }),
                jsx.jsx(Field, {
                  label: "假期日期",
                  required: true,
                  children: jsx.jsx("input", {
                    type: "date",
                    value: editing.date,
                    onChange: (event) => setEditing({ ...editing, date: event.target.value }),
                  }),
                }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx("span", {}),
                jsx.jsx(Button, {
                  onClick: saveEdit,
                  children: "儲存",
                }),
              ],
            }),
          ],
        }),
      toast && jsx.jsxs("div", { className: "toast", children: [jsx.jsx(z0, {}), toast] }),
    ],
  });
}
/* ---- 7.3 共用元件 Components：頁面標題 PageHeader ---- */
function PageHeader({ eyebrow: eyebrow, title: title, desc: desc, action: action }) {
  return jsx.jsxs("div", {
    className: "page-heading",
    children: [
      jsx.jsxs("div", {
        children: [
          jsx.jsx("p", { className: "eyebrow", children: eyebrow }),
          jsx.jsx("h1", { children: title }),
          jsx.jsx("p", { children: desc }),
        ],
      }),
      action,
    ],
  });
}
/* ---- 7.4 畫面 Screens：字典配置／角色權限／帳號管理 ---- */
function SettingsScreen({ kind: kind }) {
  const config = DemoData.settings[kind],
    [rows, setRows] = React.useState(config.rows),
    [isModalOpen, setModalOpen] = React.useState(false),
    [toast, setToast] = React.useState(""),
    [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10),
    totalPages = Math.max(1, Math.ceil(rows.length / pageSize)),
    currentPage = Math.min(Math.max(1, page), totalPages),
    pagedRows = rows
      .map((row, rowIndex) => ({ row: row, rowIndex: rowIndex }))
      .slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx(PageHeader, {
        eyebrow: config.eyebrow,
        title: config.title,
        desc: config.desc,
        action: jsx.jsxs("div", {
          className: "button-row",
          children: [
            kind === "accounts" &&
              jsx.jsx(Button, {
                variant: "outline",
                icon: rf,
                onClick: () => {
                  (setToast("AD 模擬同步完成：新增 2 個帳號"),
                    setTimeout(() => setToast(""), 2200));
                },
                children: "同步 AD",
              }),
            jsx.jsxs(Button, {
              icon: Wn,
              onClick: () => setModalOpen(true),
              children: ["新增", kind === "roles" ? "角色" : "資料"],
            }),
          ],
        }),
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "filters",
            children: [
              jsx.jsx(Field, {
                label: kind === "accounts" ? "帳號名稱" : "名稱",
                children: jsx.jsx("input", {}),
              }),
              jsx.jsx(Field, {
                label: "狀態",
                children: jsx.jsxs(Select, {
                  value: "全部",
                  children: [
                    jsx.jsx("option", { children: "全部" }),
                    jsx.jsx("option", { children: "啟用" }),
                    jsx.jsx("option", { children: "停用" }),
                  ],
                }),
              }),
              jsx.jsx(Button, { icon: Na, children: "查詢" }),
            ],
          }),
          jsx.jsxs("table", {
            children: [
              jsx.jsx("thead", {
                children: jsx.jsxs("tr", {
                  children: [
                    config.headers.map((header) => jsx.jsx("th", { children: header }, header)),
                    jsx.jsx("th", { children: "操作" }),
                  ],
                }),
              }),
              jsx.jsx("tbody", {
                children: pagedRows.map(({ row: row, rowIndex: rowIndex }) =>
                  jsx.jsxs(
                    "tr",
                    {
                      children: [
                        row.map((cell, cellIndex) =>
                          jsx.jsx(
                            "td",
                            {
                              className: cellIndex === 0 ? "strong" : "",
                              children:
                                cellIndex === 1 && kind !== "accounts"
                                  ? jsx.jsx(Badge, { children: cell })
                                  : cellIndex === 2 && kind === "accounts"
                                    ? jsx.jsx(Badge, { children: cell })
                                    : cell,
                            },
                            cellIndex,
                          ),
                        ),
                        jsx.jsx("td", {
                          children: jsx.jsxs("div", {
                            className: "icon-actions",
                            children: [
                              jsx.jsx("button", {
                                onClick: () => setModalOpen(true),
                                children: jsx.jsx(T0, {}),
                              }),
                              jsx.jsx("button", {
                                className: "danger-icon",
                                onClick: () => setRows(rows.filter((item, i) => i !== rowIndex)),
                                children: jsx.jsx(Ec, {}),
                              }),
                            ],
                          }),
                        }),
                      ],
                    },
                    rowIndex,
                  ),
                ),
              }),
            ],
          }),
          jsx.jsx(Pager, {
            total: rows.length,
            page: page,
            pageSize: pageSize,
            onPageChange: setPage,
            onPageSizeChange: (size) => (setPageSize(size), setPage(1)),
          }),
        ],
      }),
      isModalOpen &&
        jsx.jsxs(Modal, {
          title: `新增${kind === "roles" ? "角色" : "資料"}`,
          onClose: () => setModalOpen(false),
          children: [
            jsx.jsxs("div", {
              className: "form-grid",
              children: [
                jsx.jsx(Field, {
                  label: "名稱",
                  required: true,
                  children: jsx.jsx("input", {}),
                }),
                jsx.jsx(Field, {
                  label: "狀態",
                  children: jsx.jsxs(Select, {
                    value: "啟用",
                    children: [
                      jsx.jsx("option", { children: "啟用" }),
                      jsx.jsx("option", { children: "停用" }),
                    ],
                  }),
                }),
                kind === "roles" &&
                  jsx.jsx(Field, {
                    label: "權限設定",
                    wide: true,
                    children: jsx.jsx("div", {
                      className: "permission-grid",
                      children: [
                        "臨櫃收件",
                        "申請查看",
                        "上呈主管",
                        "審批申請",
                        "退回補件",
                        "發送通知",
                        "報表匯出",
                        "名單管理",
                        "模板管理",
                        "帳號管理",
                      ].map((permission) =>
                        jsx.jsxs(
                          "label",
                          {
                            children: [jsx.jsx("input", { type: "checkbox" }), permission],
                          },
                          permission,
                        ),
                      ),
                    }),
                  }),
              ],
            }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx("span", {}),
                jsx.jsx(Button, { onClick: () => setModalOpen(false), children: "儲存" }),
              ],
            }),
          ],
        }),
      toast && jsx.jsxs("div", { className: "toast", children: [jsx.jsx(z0, {}), toast] }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：操作日誌 ---- */
function OperationLogsScreen() {
  const logs = DemoData.logs,
    [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10),
    totalPages = Math.max(1, Math.ceil(logs.length / pageSize)),
    currentPage = Math.min(Math.max(1, page), totalPages),
    pagedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx(PageHeader, {
        eyebrow: "稽核",
        title: "操作日誌",
        desc: "查閱系統內所有重要操作，日誌不可修改或刪除。",
      }),
      jsx.jsxs("section", {
        className: "panel",
        children: [
          jsx.jsxs("div", {
            className: "filters",
            children: [
              jsx.jsx(Field, { label: "帳號名稱", children: jsx.jsx("input", {}) }),
              jsx.jsx(Field, {
                label: "操作類型",
                children: jsx.jsxs(Select, {
                  value: "全部",
                  children: [
                    jsx.jsx("option", { children: "全部" }),
                    jsx.jsx("option", { children: "建立" }),
                    jsx.jsx("option", { children: "更新" }),
                    jsx.jsx("option", { children: "刪除" }),
                    jsx.jsx("option", { children: "審批" }),
                  ],
                }),
              }),
              jsx.jsx(Field, {
                label: "開始日期",
                children: jsx.jsx("input", { type: "date" }),
              }),
              jsx.jsx(Field, {
                label: "結束日期",
                children: jsx.jsx("input", { type: "date" }),
              }),
              jsx.jsx(Button, { icon: Na, children: "查詢" }),
            ],
          }),
          jsx.jsxs("table", {
            children: [
              jsx.jsx("thead", {
                children: jsx.jsxs("tr", {
                  children: [
                    jsx.jsx("th", { children: "帳號" }),
                    jsx.jsx("th", { children: "操作類型" }),
                    jsx.jsx("th", { children: "操作時間" }),
                    jsx.jsx("th", { children: "操作" }),
                    jsx.jsx("th", { children: "結果" }),
                  ],
                }),
              }),
              jsx.jsx("tbody", {
                children: pagedLogs.map((row, rowIndex) =>
                  jsx.jsx(
                    "tr",
                    {
                      children: row.map((cell, cellIndex) =>
                        jsx.jsx(
                          "td",
                          {
                            className: cellIndex === 0 ? "strong" : "",
                            children: cellIndex === 4 ? jsx.jsx(Badge, { children: cell }) : cell,
                          },
                          cellIndex,
                        ),
                      ),
                    },
                    rowIndex,
                  ),
                ),
              }),
            ],
          }),
          jsx.jsx(Pager, {
            total: logs.length,
            page: page,
            pageSize: pageSize,
            onPageChange: setPage,
            onPageSizeChange: (size) => (setPageSize(size), setPage(1)),
          }),
        ],
      }),
    ],
  });
}
/* ---- 7.3 共用元件 Components：模態視窗 Modal ---- */
function Modal({ title: title, onClose: onClose, children: children }) {
  return jsx.jsx("div", {
    className: "modal-backdrop",
    onMouseDown: onClose,
    children: jsx.jsxs("div", {
      className: "modal",
      onMouseDown: (event) => event.stopPropagation(),
      children: [
        jsx.jsxs("div", {
          className: "modal-head",
          children: [
            jsx.jsx("h2", { children: title }),
            jsx.jsx("button", {
              "aria-label": "關閉",
              onClick: onClose,
              children: jsx.jsx(mf, {}),
            }),
          ],
        }),
        jsx.jsx("div", { className: "modal-body", children: children }),
      ],
    }),
  });
}
function FilePreview({ file, onClose }) {
  if (!file) return null;
  const isImage = file.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
  return jsx.jsx(Modal, {
    title: file.name || "預覽",
    onClose: onClose,
    children: jsx.jsxs("div", {
      style: { textAlign: "center", padding: "32px 0" },
      children: [
        isImage
          ? jsx.jsx(Nd, { size: 120, style: { color: "var(--text-muted)", opacity: 0.4 } })
          : jsx.jsx(W8, { size: 120, style: { color: "var(--text-muted)", opacity: 0.4 } }),
        jsx.jsx("p", {
          style: { marginTop: 16, fontSize: 14, color: "var(--text-secondary)" },
          children: file.type ? file.type + "：" + file.name : file.name,
        }),
        jsx.jsx("p", {
          style: { marginTop: 8, fontSize: 12, color: "var(--text-muted)" },
          children: "（演示預覽）",
        }),
      ],
    }),
  });
}
/* ---- 7.4 畫面 Screens：登入畫面 ---- */
function LoginScreen({ onLogin: onLogin }) {
  const [selectedRole, setSelectedRole] = React.useState("系統管理員");
  return jsx.jsxs("div", {
    className: "login-screen",
    children: [
      jsx.jsxs("div", {
        className: "login-brand",
        children: [
          jsx.jsx(V0, { size: 42, weight: "duotone" }),
          jsx.jsxs("div", {
            children: [
              jsx.jsx("h1", { children: "娛樂場禁入申請管理系統" }),
            
            ],
          }),
        ],
      }),
      jsx.jsxs("form", {
        className: "login-card",
        onSubmit: (event) => {
          (event.preventDefault(), onLogin(selectedRole));
        },
        children: [
          jsx.jsx("p", { className: "eyebrow", children: "登入" }),
          jsx.jsx("h2", { children: "歡迎回來" }),
          jsx.jsx("p", { children: "請使用模擬 AD 帳號登入系統。" }),
          jsx.jsx(Field, {
            label: "帳號名稱",
            required: true,
            children: jsx.jsx("input", { defaultValue: "DICJ-001" }),
          }),
          jsx.jsx(Field, {
            label: "密碼",
            required: true,
            children: jsx.jsx("input", {
              type: "password",
              defaultValue: "prototype",
            }),
          }),
          jsx.jsx(Field, {
            label: "模擬角色",
            children: jsx.jsxs(Select, {
              value: selectedRole,
              onChange: (event) => setSelectedRole(event.target.value),
              children: DemoData.roles.map((role) =>
                jsx.jsx("option", { children: role }, role),
              ),
            }),
          }),
          jsx.jsx(Button, { type: "submit", children: "登入系統" })
        ],
      }),
    ],
  });
}
/* ---- 7.4 畫面 Screens：主應用程式（導航／狀態／重置演示）---- */
function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(true),
    [role, setRole] = React.useState("系統管理員"),
    [route, setRoute] = React.useState(() => window.location.hash.slice(1) || "dashboard"),
    [applications, setApplications] = React.useState(DemoData.applications),
    [currentApplication, setCurrentApplication] = React.useState(null),
    [intake, setIntake] = React.useState(null),
    [checkResult, setCheckResult] = React.useState(null),
    [resumeDraft, setResumeDraft] = React.useState(null),
    [toast, setToast] = React.useState(""),
    [contextMenu, setContextMenu] = React.useState(null),
    [fillKey, setFillKey] = React.useState(0),
    [fillScenario, setFillScenario] = React.useState(""),
    [pendingLeaveAction, setPendingLeaveAction] = React.useState(null),
    [flowDirty, setFlowDirty] = React.useState(false),
        contextMenuRef = React.useRef(null),
        draftSaveRef = React.useRef(null),
    isFlowActive = isLoggedIn && (route === "intake" || route === "terminate"),
    requestLeaveFlow = (action) => {
      if (isFlowActive && flowDirty) {
        setContextMenu(null);
        setPendingLeaveAction(() => action);
      } else {
        action();
      }
    },
    openDetail = (application) => {
      (setCurrentApplication(application), setRoute("detail"));
    },
    navigate = (routeId) => {
      if (routeId === route) return;
      requestLeaveFlow(() => {
        (window.history.pushState(null, "", `#${routeId}`), setRoute(routeId), setCurrentApplication(null), setIntake(null), setCheckResult(null), setResumeDraft(null), setFlowDirty(false));
      });
    },
    continueDraft = (item) => {
      const saved = loadDraft(item.key);
      if (!saved) {
        (setToast("找不到暫存草稿"), setTimeout(() => setToast(""), 2200));
        return;
      }
      const targetRoute = saved.mode === "terminate" ? "terminate" : "intake";
      (setCurrentApplication(null),
        setIntake({
          mode: targetRoute,
          docNo: saved.docNo || item.docNo,
          applicant: { ...(saved.applicant || {}), docType: (saved.applicant && saved.applicant.docType) || item.docType },
        }),
        setCheckResult(saved.appType || true),
        setResumeDraft(saved),
        setFlowDirty(false),
        setRoute(targetRoute),
        window.history.pushState(null, "", `#${targetRoute}`),
        setToast("已恢復暫存草稿"),
        setTimeout(() => setToast(""), 2200));
    },
    resetDemo = () => requestLeaveFlow(() => {
      ((clearAllDrafts(), seedDemoDrafts()),
        setApplications(
        DemoData.applications.map((app) => ({
          ...app,
          flags: { ...(app.flags || {}) },
          history: [...(app.history || [])],
        })),
      ),
        setCurrentApplication(null),
        setIntake(null),
        setCheckResult(null),
        setResumeDraft(null),
        setFillKey(0),
        setFillScenario(""),
        setFlowDirty(false),
        setRoute("dashboard"),
        (window.history.pushState(null, "", "#dashboard")),
        setToast("演示資料已重置"),
        setTimeout(() => setToast(""), 2200));
    }),
    createApplication = (formData) => {
      var partyText;
      const caseId = `${111 + applications.length}/DICJ/2026`,
        newApplication = makeDemoApplication({
          id: caseId,
          name: formData.name,
          type:
            formData.mode === "terminate"
              ? "廢止"
              : formData.appType === "續期"
                ? "續期"
                : "申請",
          source: "親臨",
          party:
            ((partyText = formData.party) == null ? undefined : partyText.replace("申請", "")) ||
            "本人",
          status: "待處理",
          notify: "電子通知",
          time: "2026-08-27 10:30",
          applicantDetails: {
            foreignName: formData.en,
            gender: formData.applicant.gender || "",
            birthDate: formData.applicant.birth || "",
            docType: formData.applicant.docType || "",
            docNo: formData.doc,
            phone: `${formData.personal.phoneCode || ""} ${formData.personal.phone || ""}`.trim(),
            email: formData.personal.email,
            address: formData.personal.address,
          },
        });
      (formData.applicant &&
        formData.applicant.docType &&
        formData.doc &&
        removeDraft(buildDraftKey(formData.applicant.docType, formData.doc)),
        setApplications([newApplication, ...applications]),
        setCurrentApplication(newApplication),
        setRoute("detail"),
        setIntake(null),
        setCheckResult(null),
        setResumeDraft(null),
        setFlowDirty(false),
        window.history.replaceState(null, "", "#detail"),
        setToast(`申請 ${caseId} 已建立，申請表已準備列印`),
        setTimeout(() => setToast(""), 3e3));
    },
    handleTransition = (action, note) => {
      if (!currentApplication) throw new Error("找不到目前案件");
      const result = transitionApplication(currentApplication, action, role, { note: note });
      return (
        setApplications((list) => list.map((app) => (app.id === currentApplication.id ? result.application : app))),
        setCurrentApplication(result.application),
        result
      );
    },
    handleApplicantUpdate = (details) => {
      if (!currentApplication) return;
      const updatedApplication = {
        ...currentApplication,
        name: details.name,
        applicantDetails: details,
      };
      (setApplications((list) =>
        list.map((app) => (app.id === currentApplication.id ? updatedApplication : app)),
      ), setCurrentApplication(updatedApplication));
    },
    renderScreen = () => {
      if (route === "dashboard" || route === "approvals")
        return jsx.jsx(DashboardScreen, {
          applications: applications,
          onOpen: openDetail,
          onNavigate: navigate,
          role: role,
          onContinueDraft: continueDraft,
          onDeleteDraft: () => {
            (setToast("暫存草稿已刪除"), setTimeout(() => setToast(""), 2200));
          },
        });
      if (route === "intake" || route === "terminate")
        return !intake
          ? jsx.jsx(IntakeReadScreen, { mode: route, onContinue: (nextIntake) => (setResumeDraft(null), setIntake(nextIntake)), fillKey: fillKey, fillScenario: fillScenario, onDirty: () => setFlowDirty(true) })
          : !checkResult
            ? jsx.jsx(RecordCheck, {
                mode: route,
                docNo: intake.docNo,
                docType: intake.applicant && intake.applicant.docType,
                onBack: () => setIntake(null),
                onContinue: (appType) => (setResumeDraft(null), setCheckResult(appType || true)),
              })
            : jsx.jsx(ApplicationFormScreen, {
                mode: route === "terminate" ? "terminate" : "new",
                docNo: intake.docNo,
                appType: checkResult,
                applicant: intake.applicant,
                fillKey: fillKey,
                resumeDraft: resumeDraft,
                onSaveRef: (saveFn) => (draftSaveRef.current = saveFn),
                onDirty: () => setFlowDirty(true),
                onSubmit: createApplication,
                onCancel: () => (setResumeDraft(null), setCheckResult(null)),
              });
      if (route === "applications")
        return jsx.jsx(ApplicationsListScreen, { rows: applications, onOpen: openDetail });
      if (route === "detail")
        return jsx.jsx(ApplicationDetailScreen, {
          application: currentApplication,
          onBack: () => navigate("applications"),
          onTransition: handleTransition,
          onUpdateApplicant: handleApplicantUpdate,
          role: role,
        });
      if (route === "reports") return jsx.jsx(ReportsScreen, {});
      if (route === "sanctions") return jsx.jsx(SanctionsScreen, {});
      if (route === "templates") return jsx.jsx(TemplatesScreen, {});
      if (route === "holidays") return jsx.jsx(HolidaysScreen, {});
      if (["dictionary", "roles", "accounts"].includes(route))
        return jsx.jsx(SettingsScreen, { kind: route });
      if (route === "logs") return jsx.jsx(OperationLogsScreen, {});
    };
  React.useEffect(() => {
    const handleHashChange = () => {
      const id = window.location.hash.slice(1) || "dashboard";
      if (id === route) return;
      if (isFlowActive) window.history.replaceState(null, "", `#${route}`);
      requestLeaveFlow(() => {
        const target = id === "detail" && !currentApplication ? "applications" : id;
        window.history.replaceState(null, "", `#${target}`);
        (setRoute(target), setIntake(null), setCheckResult(null), setResumeDraft(null), setFlowDirty(false));
        if (target !== "detail") setCurrentApplication(null);
      });
    };
    const handleBeforeUnload = (event) => {
      if (!isFlowActive || !flowDirty) return;
      draftSaveRef.current && draftSaveRef.current();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [route, isLoggedIn, currentApplication, flowDirty]);
  React.useEffect(() => {
    /* 啟動時寫入示範草稿，確保「澳門居民身份證 12345678 已暫存」可演示 */
    seedDemoDrafts();
  }, []);
  React.useEffect(() => {
    const handleGlobalClick = (event) => {
      if (event.target && contextMenuRef.current && contextMenuRef.current.contains(event.target)) return;
      setContextMenu(null);
    };
    return (
      window.addEventListener("click", handleGlobalClick),
      () => window.removeEventListener("click", handleGlobalClick)
    );
  }, []);
  if (!isLoggedIn)
    return jsx.jsx(LoginScreen, {
      onLogin: (selectedRole) => {
        (setRole(selectedRole),
          setIsLoggedIn(true),
          setRoute(selectedRole === "櫃枱人員" ? "intake" : "dashboard"),
          setFlowDirty(false),
          (window.location.hash = selectedRole === "櫃枱人員" ? "intake" : "dashboard"));
      },
    });
  const roleAccess = {
      櫃枱人員: ["dashboard", "intake", "applications"],
      處理人員: [
        "dashboard",
        "applications",
        "reports",
        "sanctions",
      ],
      主管: [
        "dashboard",
        "applications",
        "reports",
        "sanctions",
        "templates",
        "logs",
      ],
      系統管理員: NAV_ITEMS.map((navItem) => navItem.id),
    },
    visibleNavItems = NAV_ITEMS.filter((navItem) => roleAccess[role].includes(navItem.id)),
    approvalCount = getActionableApplications(applications, role).length,
    account = DemoAccounts.find((account) => account.role === role) || DemoAccounts[3];
  return jsx.jsxs("div", {
    className: "app-shell",
    onContextMenu: (contextEvent) => {
      (contextEvent.preventDefault(), setContextMenu({ x: contextEvent.clientX, y: contextEvent.clientY }));
    },
    children: [
      jsx.jsxs("header", {
        children: [
          jsx.jsxs("div", {
            className: "brand",
            children: [
              
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("b", { children: "娛樂場禁入申請管理系統" }),
                ],
              }),
            ],
          }),
          jsx.jsxs("div", {
            className: "user-menu",
            children: [
              jsx.jsxs("div", {
                children: [
                  jsx.jsx("b", { children: account.name }),
                  jsx.jsx("span", { children: role }),
                ],
              }),
              jsx.jsx(Nd, { size: 32 }),
              jsx.jsxs("button", {
                className: "logout",
                onClick: () => requestLeaveFlow(() => {
                  (setIntake(null), setCheckResult(null), setFlowDirty(false), setIsLoggedIn(false));
                }),
                children: [jsx.jsx(zd, { size: 19 }), "登出"],
              }),
            ],
          }),
        ],
      }),
      jsx.jsxs("aside", {
        className: "sidebar",
        children: [
          jsx.jsx("nav", {
            children: visibleNavItems.map((navItem) =>
              jsx.jsxs(
                "div",
                {
                  className: "nav-group",
                  children: [
                    jsx.jsxs("button", {
                      className:
                        route === navItem.id ||
                        (navItem.children && navItem.children.some((child) => child.id === route))
                          ? "active"
                          : "",
                      onClick: () => navigate(navItem.id),
                      children: [
                        navItem.icon &&
                          jsx.jsx("span", {
                            className: "nav-icon",
                            children: jsx.jsx(navItem.icon, { size: 19, weight: "duotone" }),
                          }),
                        jsx.jsx("span", { children: navItem.label }),
                        ((navItem.id === "dashboard" ? approvalCount : navItem.badge) > 0) &&
                          jsx.jsx("i", {
                            children: navItem.id === "dashboard" ? approvalCount : navItem.badge,
                          }),
                        navItem.children && jsx.jsx(Ad, { size: 15 }),
                      ],
                    }),
                    navItem.children &&
                      jsx.jsx("div", {
                        className: "subnav",
                        children: navItem.children.map((child) =>
                          jsx.jsx(
                            "button",
                            {
                              className: route === child.id ? "active" : "",
                              onClick: () => navigate(child.id),
                              children: child.label,
                            },
                            child.id,
                          ),
                        ),
                      }),
                  ],
                },
                navItem.id,
              ),
            ),
          }),

        ],
      }),
      jsx.jsx("main", { className: "content", children: renderScreen() }),
      pendingLeaveAction && jsx.jsx(Modal, {
        title: "確認離開流程",
        onClose: () => setPendingLeaveAction(null),
        children: jsx.jsxs(jsx.Fragment, {
          children: [
            jsx.jsx("p", {
              className: "confirm-text",
              children: "申請或廢止流程尚未完成，離開時會將已填寫的資料暫存為草稿，可依證件資料恢復。確定要離開嗎？",
            }),
            jsx.jsxs("div", {
              className: "form-actions",
              children: [
                jsx.jsx(Button, {
                  variant: "danger",
                  onClick: () => {
                    setPendingLeaveAction(null);
                    draftSaveRef.current && draftSaveRef.current();
                    pendingLeaveAction();
                  },
                  children: "確認離開並暫存",
                }),
                jsx.jsx(Button, {
                  onClick: () => setPendingLeaveAction(null),
                  children: "繼續填寫",
                }),
              ],
            }),
          ],
        }),
      }),
      toast &&
        jsx.jsxs("div", { className: "toast", children: [jsx.jsx(z0, {}), toast] }),
      contextMenu &&
        jsx.jsxs("div", {
          ref: contextMenuRef,
          className: "context-menu",
          style: { left: contextMenu.x, top: contextMenu.y },
          children: [
            jsx.jsx("div", { className: "menu-label", children: "演示用 · 切換角色" }),
            jsx.jsx(Select, {
              value: role,
              onChange: (event) => {
                const newRole = event.target.value;
                const mustLeave = route !== "detail" && !roleAccess[newRole].includes(route);
                const changeRole = () => {
                if (mustLeave) {
                  (window.history.pushState(null, "", "#dashboard"), setRoute("dashboard"), setIntake(null), setCheckResult(null), setFlowDirty(false));
                }
                (setRole(newRole),
                  setToast(`已切換為${newRole}`),
                  setTimeout(() => setToast(""), 1800),
                  setContextMenu(null));
                };
                if (mustLeave) requestLeaveFlow(changeRole);
                else changeRole();
              },
              children: DemoData.roles.map((roleOption) =>
                jsx.jsx("option", { value: roleOption, children: roleOption }, roleOption),
              ),
            }),
            jsx.jsx("div", { className: "menu-label", children: "演示用 · 填充申請資料" }),
            jsx.jsx("button", {
              onClick: () => {
                (setContextMenu(null), setFillScenario("renew"), setFillKey(fillKey + 1));
              },
              children: "30天可續期",
            }),
            jsx.jsx("button", {
              onClick: () => {
                (setContextMenu(null), setFillScenario("blocked"), setFillKey(fillKey + 1));
              },
              children: "未到期",
            }),
            jsx.jsx("button", {
              onClick: () => {
                (setContextMenu(null), setFillScenario("fresh"), setFillKey(fillKey + 1));
              },
              children: "新申請",
            }),
            jsx.jsx("div", { className: "menu-divider" }),
            jsx.jsx("button", {
              onClick: () => {
                (setContextMenu(null), resetDemo());
              },
              children: "重置演示資料",
            }),
          ],
        }),
    ],
  });
}
/* ---- 7.5 應用程式入口 App entry ---- */
ReactDOM.createRoot(document.getElementById("root")).render(
  jsx.jsx(StrictMode.StrictMode, { children: jsx.jsx(App, {}) }),
);
