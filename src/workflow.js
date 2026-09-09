(function attachWorkflow(root, factory) {
  const workflow = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = workflow;
  if (root) root.DICJWorkflow = workflow;
})(typeof window !== "undefined" ? window : null, function createWorkflow() {
  const ROLES = {
    COUNTER: "櫃枱人員",
    PROCESSOR: "處理人員",
    SUPERVISOR: "主管",
    ADMIN: "系統管理員",
  };

  const SOURCES = {
    ONLINE: "一戶通",
    COUNTER: "親臨",
  };

  const TERMINAL_STATUSES = new Set(["完成", "作廢"]);
  const COUNTER_VOIDABLE_STATUSES = new Set(["待處理", "待審批", "已審批"]);

  const ACTIONS = {
    confirm_missing: {
      label: "確認缺件",
      role: ROLES.COUNTER,
      section: "main",
      variant: "danger",
      message: "已確認缺件，案件進入補件通知準備階段",
    },
    submit_initial_review: {
      label: "完成初審並送複核",
      role: ROLES.COUNTER,
      section: "main",
      message: "初審完成，案件已送交處理人員複核",
    },
    send_supplement_notice: {
      label: "發送補件通知",
      role: ROLES.COUNTER,
      section: "notification",
      message: "補件通知已發送",
    },
    confirm_supplement_received: {
      label: "確認收到補交資料",
      role: ROLES.COUNTER,
      section: "notification",
      message: "已收到補交資料，案件返回初步檢查",
    },
    complete_review: {
      label: "完成複核並送審",
      role: ROLES.PROCESSOR,
      section: "main",
      message: "複核完成，案件已送交主管審批",
    },
    return_case: {
      label: "退回案件",
      role: ROLES.PROCESSOR,
      section: "main",
      variant: "danger",
      message: "案件已退回收件人員跟進修正",
    },
    approve_sign: {
      label: "審批通過並雲簽",
      role: ROLES.SUPERVISOR,
      section: "main",
      message: "審批完成，文件已雲簽",
    },
    request_return: {
      label: "要求退回",
      role: ROLES.SUPERVISOR,
      section: "main",
      variant: "danger",
      message: "主管已要求退回案件修正",
    },
    send_correction_notice: {
      label: "發送修正通知",
      role: ROLES.COUNTER,
      section: "notification",
      message: "修正通知已發送予申請人",
    },
    resubmit_review: {
      label: "確認補交並重新送複核",
      role: ROLES.COUNTER,
      section: "main",
      message: "補交資料已確認，案件重新送交複核",
    },
    complete_processing: {
      label: "完成案件處理",
      role: ROLES.PROCESSOR,
      section: "main",
      message: "已記錄處理人員完成案件處理",
    },
    print_signed_documents: {
      label: "列印已簽文件",
      role: ROLES.COUNTER,
      section: "document",
      message: "已簽文件已列印",
    },
    send_pickup_notice: {
      label: "發送取件通知",
      role: ROLES.COUNTER,
      section: "notification",
      message: "取件通知已發送",
    },
    record_handover: {
      label: "記錄交件及簽收",
      role: ROLES.COUNTER,
      section: "notification",
      message: "已記錄交件與申請人簽收，案件完成",
    },
    counter_submit_review: {
      label: "完成列印、簽署並送複核",
      role: ROLES.COUNTER,
      section: "main",
      message: "臨櫃申請表已簽署，案件送交處理人員複核",
    },
    counter_complete_review: {
      label: "完成複核並送主管",
      role: ROLES.PROCESSOR,
      section: "main",
      message: "複核完成，案件已轉交主管審批",
    },
    counter_approve_sign: {
      label: "審批通過並雲簽",
      role: ROLES.SUPERVISOR,
      section: "main",
      message: "審批完成，通知書及公函已雲簽",
    },
    counter_print_documents: {
      label: "列印通知書／公函",
      role: ROLES.COUNTER,
      section: "document",
      message: "通知書及公函已列印",
    },
    counter_record_handover: {
      label: "記錄領取及簽收",
      role: ROLES.COUNTER,
      section: "notification",
      message: "文件已交付並完成簽收，案件完成",
    },
    void_case: {
      label: "作廢案件",
      roles: [ROLES.PROCESSOR, ROLES.SUPERVISOR],
      section: "main",
      variant: "danger",
      message: "案件已作廢",
    },
  };

  function nowString() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function cloneFlags(application) {
    return {
      correctionNoticeSent: false,
      processingCompleted: false,
      documentsPrinted: false,
      ...(application.flags || {}),
    };
  }

  function actionAllowedForRole(action, role) {
    return role === ROLES.ADMIN || action.role === role || (action.roles || []).includes(role);
  }

  function availableOnlineActionIds(application) {
    const flags = cloneFlags(application);
    switch (application.status) {
      case "待處理":
        return ["confirm_missing", "submit_initial_review"];
      case "待通知補件":
        return ["send_supplement_notice"];
      case "已通知補件":
        return ["confirm_supplement_received"];
      case "待複核":
        return ["return_case", "complete_review"];
      case "待審批":
        return ["request_return", "approve_sign"];
      case "退回":
        return flags.correctionNoticeSent
          ? ["resubmit_review"]
          : ["send_correction_notice"];
      case "已審批": {
        const actionIds = [];
        if (!flags.processingCompleted) actionIds.push("complete_processing");
        if (!flags.documentsPrinted) actionIds.push("print_signed_documents");
        if (flags.documentsPrinted) actionIds.push("send_pickup_notice");
        return actionIds;
      }
      case "已通知取件":
        return ["record_handover"];
      default:
        return [];
    }
  }

  function availableCounterActionIds(application) {
    const flags = cloneFlags(application);
    const actionIds = [];

    if (application.status === "待處理") actionIds.push("counter_submit_review");
    if (application.status === "待審批" && application.stage === "processor_review") {
      actionIds.push("counter_complete_review");
    }
    if (application.status === "待審批" && application.stage === "supervisor_approval") {
      actionIds.push("counter_approve_sign");
    }
    if (application.status === "已審批") {
      if (!flags.processingCompleted) actionIds.push("complete_processing");
      if (!flags.documentsPrinted) actionIds.push("counter_print_documents");
      if (flags.documentsPrinted) actionIds.push("counter_record_handover");
    }
    if (COUNTER_VOIDABLE_STATUSES.has(application.status)) actionIds.push("void_case");
    return actionIds;
  }

  function getAvailableActions(application, role) {
    if (!application || TERMINAL_STATUSES.has(application.status)) return [];
    const ids = application.source === SOURCES.ONLINE
      ? availableOnlineActionIds(application)
      : availableCounterActionIds(application);
    return ids
      .map((id) => ({ id, ...ACTIONS[id] }))
      .filter((action) => actionAllowedForRole(action, role));
  }

  function getResponsibleRole(application) {
    if (!application) return "—";
    if (application.status === "完成") return "已完成";
    if (application.status === "作廢") return "已作廢";
    if (application.source === SOURCES.ONLINE) {
      if (["待處理", "待通知補件", "已通知補件", "退回", "已通知取件"].includes(application.status)) {
        return ROLES.COUNTER;
      }
      if (application.status === "待複核") return ROLES.PROCESSOR;
      if (application.status === "待審批") return ROLES.SUPERVISOR;
      if (application.status === "已審批") return `${ROLES.PROCESSOR}／${ROLES.COUNTER}`;
    }
    if (application.status === "待處理") return ROLES.COUNTER;
    if (application.status === "待審批") {
      return application.stage === "supervisor_approval" ? ROLES.SUPERVISOR : ROLES.PROCESSOR;
    }
    if (application.status === "已審批") return `${ROLES.PROCESSOR}／${ROLES.COUNTER}`;
    return "—";
  }

  function getStageLabel(application) {
    if (!application) return "—";
    if (application.status === "完成") return "流程完成";
    if (application.status === "作廢") return "案件已終止";
    if (application.source === SOURCES.COUNTER && application.status === "待審批") {
      return application.stage === "supervisor_approval" ? "待主管審批" : "待處理人員複核";
    }
    const labels = {
      待處理: "初步檢查",
      待通知補件: "準備補件通知",
      已通知補件: "等待補交資料",
      退回: "等待修正及補交",
      待複核: "案件複核",
      待審批: "主管審批",
      已審批: "文件及交件處理",
      已通知取件: "等待申請人取件",
    };
    return labels[application.status] || application.status;
  }

  function applyAction(application, actionId) {
    const next = {
      ...application,
      flags: cloneFlags(application),
      history: [...(application.history || [])],
    };

    switch (actionId) {
      case "confirm_missing":
        next.status = "待通知補件";
        break;
      case "submit_initial_review":
        next.status = "待複核";
        break;
      case "send_supplement_notice":
        next.status = "已通知補件";
        break;
      case "confirm_supplement_received":
        next.status = "待處理";
        break;
      case "complete_review":
        next.status = "待審批";
        break;
      case "return_case":
      case "request_return":
        next.status = "退回";
        next.flags.correctionNoticeSent = false;
        break;
      case "approve_sign":
      case "counter_approve_sign":
        next.status = "已審批";
        next.stage = null;
        break;
      case "send_correction_notice":
        next.flags.correctionNoticeSent = true;
        break;
      case "resubmit_review":
        next.status = "待複核";
        next.flags.correctionNoticeSent = false;
        break;
      case "complete_processing":
        next.flags.processingCompleted = true;
        break;
      case "print_signed_documents":
      case "counter_print_documents":
        next.flags.documentsPrinted = true;
        break;
      case "send_pickup_notice":
        next.status = "已通知取件";
        break;
      case "record_handover":
      case "counter_record_handover":
        next.status = "完成";
        next.stage = null;
        break;
      case "counter_submit_review":
        next.status = "待審批";
        next.stage = "processor_review";
        break;
      case "counter_complete_review":
        next.status = "待審批";
        next.stage = "supervisor_approval";
        break;
      case "void_case":
        next.status = "作廢";
        next.stage = null;
        break;
      default:
        throw new Error("未知的流程操作");
    }
    return next;
  }

  function transition(application, actionId, role, options) {
    const availableAction = getAvailableActions(application, role).find((action) => action.id === actionId);
    if (!availableAction) throw new Error("目前角色或案件狀態不允許此操作");

    const previousStatus = application.status;
    const next = applyAction(application, actionId);
    const note = options && options.note ? String(options.note).trim() : "";
    next.history.push({
      actorRole: role,
      action: availableAction.label,
      fromStatus: previousStatus,
      toStatus: next.status,
      time: (options && options.time) || nowString(),
      note,
    });
    return { application: next, message: availableAction.message };
  }

  function isActionable(application, role) {
    return getAvailableActions(application, role).length > 0;
  }

  function getActionableApplications(applications, role) {
    return applications.filter((application) => isActionable(application, role));
  }

  return {
    ACTIONS,
    ROLES,
    SOURCES,
    TERMINAL_STATUSES,
    getActionableApplications,
    getAvailableActions,
    getResponsibleRole,
    getStageLabel,
    isActionable,
    transition,
  };
});
