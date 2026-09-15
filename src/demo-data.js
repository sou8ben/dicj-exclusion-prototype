/* ----------------------------------------------------------------
 * 7.1 示範資料 Demo Data
 * 集中所有演示假數據：登入帳號、申請、行政處罰名單、模板、
 * 操作日誌、報表、字典／角色／帳號設定。
 * 在頁面按滑鼠右鍵，選「重置演示資料」即還原到這裡的初始值。
 * ---------------------------------------------------------------- */
const DemoAccounts = [
  {
    id: "DICJ-001",
    name: "陳怡婷",
    role: "櫃枱人員",
    status: "啟用",
    updated: "2026-07-05 10:20",
  },
  {
    id: "DICJ-002",
    name: "吳建成",
    role: "處理人員",
    status: "停用",
    updated: "2026-07-06 14:05",
  },
  {
    id: "DICJ-003",
    name: "劉佩珊",
    role: "主管",
    status: "啟用",
    updated: "2026-07-08 09:40",
  },
  {
    id: "DICJ-004",
    name: "陳嘉敏",
    role: "系統管理員",
    status: "啟用",
    updated: "2026-08-27 09:40",
  },
];

const dicjWorkflow = window.DICJWorkflow;
const {
  ROLES: WorkflowRoles,
  getActionableApplications,
  getAvailableActions,
  transition: transitionApplication,
} = dicjWorkflow;

const makeDemoApplication = (application) => ({
  stage: null,
  flags: {
    correctionNoticeSent: false,
    processingCompleted: false,
    documentsPrinted: false,
  },
  history: [
    {
      actorRole: application.source === "一戶通" ? "申請人" : "櫃枱人員",
      action: `${application.source}建立${application.type}`,
      fromStatus: null,
      toStatus: "待處理",
      time: application.time,
      note: "",
    },
  ],
  ...application,
  applicantDetails: {
    foreignName: "WONG CHI MEN",
    gender: "男",
    birthDate: "1984-03-16",
    docType: "澳門居民身份證",
    docNo: "1234567(8)",
    phone: "+853 6688 1234",
    email: "demo@example.com",
    address: "澳門黑沙環海邊馬路88號",
    ...(application.applicantDetails || {}),
  },
  flags: {
    correctionNoticeSent: false,
    processingCompleted: false,
    documentsPrinted: false,
    ...(application.flags || {}),
  },
});

const padDatePart = (part) => String(part).padStart(2, "0"),
  // 澳門居民身份證 13888888 的廢止時間：當前日期 + 20 天，讓廢止申請流程隨時可演示
  exclusionEndDate = (() => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 20);
    return `${endDate.getFullYear()}-${padDatePart(endDate.getMonth() + 1)}-${padDatePart(endDate.getDate())} 00:00`;
  })();

const DemoData = {
  roles: ["櫃枱人員", "處理人員", "主管", "系統管理員"],
  accounts: DemoAccounts,
  // 超時未審批判定天數（SLA）
  slaDays: 3,
  applications: [
    makeDemoApplication({
      id: "110/DICJ/2026",
      name: "梁志明",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "待處理",
      notify: "電子通知",
      time: "2026-08-26 09:18",
    }),
    makeDemoApplication({
      id: "109/DICJ/2026",
      name: "黃美玲",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "待通知補件",
      notify: "電子通知",
      time: "2026-08-25 16:42",
    }),
    makeDemoApplication({
      id: "108/DICJ/2026",
      name: "郭子健",
      type: "廢止",
      source: "一戶通",
      party: "本人",
      status: "已通知補件",
      notify: "電子通知",
      time: "2026-08-25 11:26",
    }),
    makeDemoApplication({
      id: "107/DICJ/2026",
      name: "蘇麗華",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "待複核",
      notify: "電子通知",
      time: "2026-08-24 14:05",
    }),
    makeDemoApplication({
      id: "106/DICJ/2026",
      name: "林國強",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "待審批",
      notify: "電子通知",
      time: "2026-08-23 10:20",
    }),
    makeDemoApplication({
      id: "105/DICJ/2026",
      name: "陳小燕",
      type: "續期",
      source: "一戶通",
      party: "本人",
      status: "退回",
      notify: "電子通知",
      time: "2026-08-22 15:36",
    }),
    makeDemoApplication({
      id: "104/DICJ/2026",
      name: "何志雄",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "已審批",
      notify: "電子通知",
      time: "2026-08-21 09:42",
    }),
    makeDemoApplication({
      id: "103/DICJ/2026",
      name: "麥美儀",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "已通知取件",
      flags: { documentsPrinted: true, processingCompleted: true },
      notify: "電子通知",
      time: "2026-08-20 12:12",
    }),
    makeDemoApplication({
      id: "102/DICJ/2026",
      name: "羅家明",
      type: "申請",
      source: "一戶通",
      party: "本人",
      status: "完成",
      flags: { documentsPrinted: true, processingCompleted: true },
      notify: "電子通知",
      time: "2026-08-19 10:08",
    }),
    makeDemoApplication({
      id: "101/DICJ/2026",
      name: "區麗珊",
      type: "申請",
      source: "親臨",
      party: "本人",
      status: "待處理",
      notify: "短信",
      time: "2026-08-26 13:24",
    }),
    makeDemoApplication({
      id: "100/DICJ/2026",
      name: "周永康",
      type: "申請",
      source: "親臨",
      party: "親屬",
      status: "待審批",
      stage: "processor_review",
      notify: "短信",
      time: "2026-08-25 10:18",
    }),
    makeDemoApplication({
      id: "099/DICJ/2026",
      name: "李嘉欣",
      type: "申請",
      source: "親臨",
      party: "本人",
      status: "待審批",
      stage: "supervisor_approval",
      notify: "短信",
      time: "2026-08-24 16:09",
    }),
    makeDemoApplication({
      id: "098/DICJ/2026",
      name: "馮少芬",
      type: "續期",
      source: "親臨",
      party: "親屬",
      status: "已審批",
      notify: "短信",
      time: "2026-08-23 11:31",
    }),
    makeDemoApplication({
      id: "097/DICJ/2026",
      name: "林國強",
      type: "廢止",
      source: "親臨",
      party: "本人",
      status: "完成",
      flags: { documentsPrinted: true, processingCompleted: true },
      notify: "電子通知",
      time: "2026-08-22 10:20",
    }),
    makeDemoApplication({
      id: "096/DICJ/2026",
      name: "鄭文浩",
      type: "申請",
      source: "親臨",
      party: "本人",
      status: "作廢",
      notify: "短信",
      time: "2026-08-18 09:35",
    }),
  ],
  sanctions: [
    {
      zh: "何國偉",
      en: "HO KUOK WAI",
      doc: "澳門居民身份證",
      no: "5566778(3)",
      scope: "全部",
      start: "2026-07-12 09:18",
      end: "2027-07-12 09:18",
    },
    {
      zh: "麥心怡",
      en: "MAK SAM I",
      doc: "外地僱員身份認別證",
      no: "P1234567",
      scope: "全部",
      start: "2026-06-10 10:00",
      end: "2027-06-10 10:00",
    },
    {
      zh: "彭家傑",
      en: "PANG KA KIT",
      doc: "澳門居民身份證",
      no: "3321567(0)",
      scope: "銀河娛樂",
      start: "2026-05-12 09:18",
      end: "2027-05-12 09:18",
    },
    {
      zh: "陳嘉玲",
      en: "CHAN KA LENG",
      doc: "澳門居民身份證",
      no: "8899221(4)",
      scope: "全部",
      start: "2026-04-08 15:30",
      end: "2027-04-08 15:30",
    },
  ],
  // 公眾假期（第60/2000號行政命令訂定的 2026 年公眾假期，由 ICS 日曆檔匯入）
  holidays: [
    { name: "元旦", date: "2026-01-01", created: "2026-06-30 15:20" },
    { name: "農曆正月初一", date: "2026-02-17", created: "2026-06-30 15:20" },
    { name: "農曆正月初二", date: "2026-02-18", created: "2026-06-30 15:20" },
    { name: "農曆正月初三", date: "2026-02-19", created: "2026-06-30 15:20" },
    { name: "耶穌受難日", date: "2026-04-03", created: "2026-06-30 15:20" },
    { name: "復活節前日", date: "2026-04-04", created: "2026-06-30 15:20" },
    { name: "清明節", date: "2026-04-05", created: "2026-06-30 15:20" },
    { name: "勞動節", date: "2026-05-01", created: "2026-06-30 15:20" },
    { name: "佛誕節", date: "2026-05-24", created: "2026-06-30 15:20" },
    { name: "端午節", date: "2026-06-19", created: "2026-06-30 15:20" },
    { name: "中秋節翌日", date: "2026-09-26", created: "2026-06-30 15:20" },
    { name: "中華人民共和國國慶日", date: "2026-10-01", created: "2026-06-30 15:20" },
    { name: "中華人民共和國國慶日翌日", date: "2026-10-02", created: "2026-06-30 15:20" },
    { name: "重陽節", date: "2026-10-18", created: "2026-06-30 15:20" },
    { name: "追思節", date: "2026-11-02", created: "2026-06-30 15:20" },
    { name: "聖母無原罪瞻禮", date: "2026-12-08", created: "2026-06-30 15:20" },
    { name: "澳門特別行政區成立紀念日", date: "2026-12-20", created: "2026-06-30 15:20" },
    { name: "冬至", date: "2026-12-22", created: "2026-06-30 15:20" },
    { name: "聖誕節前日", date: "2026-12-24", created: "2026-06-30 15:20" },
    { name: "聖誕節", date: "2026-12-25", created: "2026-06-30 15:20" },
  ],
  // 以「證件類型:證件號碼」為鍵，核查時需兩者相符
  exclusionHistory: {
    "澳門居民身份證:13888888": [
      {
        id: "98/DICJ/2025",
        scope: "全部",
        createdAt: "2025-08-20 09:15",
        start: "2025-09-01 00:00",
        end: exclusionEndDate,
      },
      {
        id: "8/DICJ/2025",
        scope: "全部",
        createdAt: "2024-08-20 09:15",
        start: "2024-09-01 00:00",
        end: "2025-09-01 00:00",
      },
    ],
    "澳門居民身份證:88888888": [
      {
        id: "88/DICJ/2025",
        scope: "全部",
        createdAt: "2025-08-20 09:15",
        start: "2025-09-01 00:00",
        end: "2027-09-01 00:00",
      },
    ],
    "澳門居民身份證:20001234": [
      {
        id: "61/DICJ/2024",
        scope: "全部",
        createdAt: "2024-05-10 09:00",
        start: "2024-06-01 00:00",
        end: "2027-06-01 00:00",
      },
    ],
  },
  templates: [
    {
      name: "批准通知",
      type: "電子通知",
      content: "【DICJ】{{申請人姓名}}您好，禁入申請 {{禁入編號}} 已獲批准。",
      active: !0,
    },
    {
      name: "即將到期提醒",
      type: "短信",
      content: "【DICJ】{{申請人姓名}}您好，禁入令將於 {{到期日}} 到期。",
      active: !0,
    },
    {
      name: "補件通知",
      type: "短信",
      content: "【DICJ】請於六個月內補交所需文件。",
      active: !1,
    },
  ],
  logs: [
    ["DICJ-001", "建立", "2026-08-27 10:20", "本人申請 123/DICJ/2026", "成功"],
    ["DICJ-002", "更新", "2026-08-27 10:05", "行政處罰名單", "成功"],
    ["DICJ-003", "審批", "2026-08-27 09:40", "申請 107/DICJ/2026", "成功"],
    ["DICJ-001", "匯入", "2026-08-26 16:12", "行政處罰名單", "部分成功"],
  ],
  reports: [
    "禁入申請總表",
    "承批公司千人比例表",
    "娛樂場禁入申請統計表",
    "娛樂場禁入申請季度統計表",
    "社會工作局轉介報表",
  ],
  settings: {
    dictionary: {
      eyebrow: "系統設定",
      title: "字典配置",
      desc: "維護承批公司及證件類型等共用資料。",
      headers: ["名稱", "類別", "狀態", "更新時間"],
      rows: [
        ["澳娛綜合度假股份有限公司", "承批公司", "啟用", "2026-07-05 10:20"],
        ["銀河娛樂場股份有限公司", "承批公司", "啟用", "2026-07-06 14:05"],
        ["澳門居民身份證", "證件類型", "啟用", "2026-07-08 09:40"],
      ],
    },
    roles: {
      eyebrow: "存取控制",
      title: "角色權限管理",
      desc: "設定角色可查閱及操作的系統功能。",
      headers: ["名稱", "狀態", "權限摘要", "更新時間"],
      rows: [
        ["櫃枱人員", "啟用", "收件新增、申請查看", "2026-07-05 10:20"],
        ["處理人員", "啟用", "查看、上呈、退回、通知", "2026-07-06 14:05"],
        ["主管", "啟用", "查看、審批、退回、簽署", "2026-07-08 09:40"],
        ["系統管理員", "啟用", "全部系統管理權限", "2026-07-08 09:40"],
      ],
    },
    accounts: {
      eyebrow: "使用者管理",
      title: "帳號管理",
      desc: "同步內部帳號並指派角色與狀態。",
      headers: ["帳號名稱", "姓名", "狀態", "角色", "更新時間"],
      rows: DemoAccounts.map((a) => [a.id, a.name, a.status, a.role, a.updated]),
    },
  },
};

/* ----------------------------------------------------------------
 * 7.2 暫存草稿示範資料 Demo Drafts
 * 暫存以「證件類型 + 證件號碼」為 key 核心，寫入 localStorage。
 * 頁面載入及「重置演示資料」時由 app.js 的 seedDemoDrafts() 寫入，
 * 供臨櫃收件流程演示「偵測草稿 → 恢復填寫」。
 * ---------------------------------------------------------------- */
const DraftKeyPrefix = "dicj:draft:";
const DemoDrafts = {
  [`${DraftKeyPrefix}澳門居民身份證:12345678`]: {
    v: 1,
    savedAt: "2026-09-11 10:15",
    mode: "new",
    appType: "新申請",
    docNo: "12345678",
    applicant: { gender: "男", birth: "1990-03-15", docType: "澳門居民身份證" },
    step: 2,
    partyType: "本人申請",
    term: "一年",
    scope: "全部",
    counsel: "同意",
    docType: "澳門居民身份證",
    documents: [{ type: "澳門居民身份證", name: "澳門身份證正面.jpg" }],
    photoName: "近照.jpg",
    personal: {
      occupation: "工程師",
      email: "demo@example.com",
      phoneCode: "+853",
      phone: "66123456",
      address: "澳門南灣大馬路123號",
    },
    effectiveDate: "2026-08-30",
    endDate: "2027-08-30",
    companies: [],
    relativeDocType: "",
    relativeFiles: [],
    relativeReadMethod: "",
    relative: {
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
    },
  },
};

/* ----------------------------------------------------------------
 * 7.3 右鍵演示填充設定 Demo Fill Profiles
 * 對應臨櫃收件「核查禁入紀錄」的三種結果：
 * renew（30天內到期）→ 13888888、blocked（未到期）→ 88888888、
 * fresh（無紀錄，新申請）→ 12345670。
 * ---------------------------------------------------------------- */
const DemoFillProfiles = {
  renew: { gender: "男", enName: "CHAN DAI MAN", birth: "1998-08-08", docType: "澳門居民身份證", docNo: "13888888" },
  blocked: { gender: "男", enName: "WONG CHI MING", birth: "1985-03-12", docType: "澳門居民身份證", docNo: "88888888" },
  fresh: { gender: "女", enName: "LEI MEI LENG", birth: "1992-07-21", docType: "澳門居民身份證", docNo: "12345670" },
};
