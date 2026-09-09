import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workflow = require("../src/workflow.js");
const { ROLES, getAvailableActions, transition } = workflow;

function application(overrides = {}) {
  return {
    id: "TEST/DICJ/2026",
    source: "一戶通",
    status: "待處理",
    stage: null,
    flags: {},
    history: [],
    ...overrides,
  };
}

function run(current, actionId, role) {
  return transition(current, actionId, role, {
    time: "2026-08-27 10:30",
    note: "測試意見",
  }).application;
}

test("一戶通初檢缺件補交後回到待處理", () => {
  let current = application();
  current = run(current, "confirm_missing", ROLES.COUNTER);
  assert.equal(current.status, "待通知補件");
  current = run(current, "send_supplement_notice", ROLES.COUNTER);
  assert.equal(current.status, "已通知補件");
  current = run(current, "confirm_supplement_received", ROLES.COUNTER);
  assert.equal(current.status, "待處理");
  assert.equal(current.history.length, 3);
});

test("一戶通複核退回在修正通知後重新送複核", () => {
  let current = application({ status: "待複核" });
  current = run(current, "return_case", ROLES.PROCESSOR);
  assert.equal(current.status, "退回");
  assert.deepEqual(
    getAvailableActions(current, ROLES.COUNTER).map((action) => action.id),
    ["send_correction_notice"],
  );
  current = run(current, "send_correction_notice", ROLES.COUNTER);
  assert.equal(current.flags.correctionNoticeSent, true);
  current = run(current, "resubmit_review", ROLES.COUNTER);
  assert.equal(current.status, "待複核");
});

test("一戶通主管可退回，亦可審批至完成", () => {
  const returned = run(application({ status: "待審批" }), "request_return", ROLES.SUPERVISOR);
  assert.equal(returned.status, "退回");

  let current = run(application({ status: "待審批" }), "approve_sign", ROLES.SUPERVISOR);
  assert.equal(current.status, "已審批");
  current = run(current, "complete_processing", ROLES.PROCESSOR);
  assert.equal(current.flags.processingCompleted, true);
  current = run(current, "print_signed_documents", ROLES.COUNTER);
  assert.equal(current.flags.documentsPrinted, true);
  current = run(current, "send_pickup_notice", ROLES.COUNTER);
  assert.equal(current.status, "已通知取件");
  current = run(current, "record_handover", ROLES.COUNTER);
  assert.equal(current.status, "完成");
  assert.equal(getAvailableActions(current, ROLES.COUNTER).length, 0);
});

test("臨櫃待審批以內部階段轉移負責角色", () => {
  let current = application({ source: "親臨" });
  current = run(current, "counter_submit_review", ROLES.COUNTER);
  assert.equal(current.status, "待審批");
  assert.equal(current.stage, "processor_review");
  current = run(current, "counter_complete_review", ROLES.PROCESSOR);
  assert.equal(current.status, "待審批");
  assert.equal(current.stage, "supervisor_approval");
  current = run(current, "counter_approve_sign", ROLES.SUPERVISOR);
  assert.equal(current.status, "已審批");
  current = run(current, "counter_print_documents", ROLES.COUNTER);
  current = run(current, "counter_record_handover", ROLES.COUNTER);
  assert.equal(current.status, "完成");
});

test("處理人員與主管可作廢未完成的臨櫃案件", () => {
  for (const role of [ROLES.PROCESSOR, ROLES.SUPERVISOR]) {
    for (const status of ["待處理", "待審批", "已審批"]) {
      const stage = status === "待審批" ? "processor_review" : null;
      const current = run(application({ source: "親臨", status, stage }), "void_case", role);
      assert.equal(current.status, "作廢");
    }
  }
});

test("角色與終止狀態限制會阻止越權操作", () => {
  assert.throws(
    () => run(application({ status: "待審批" }), "approve_sign", ROLES.PROCESSOR),
    /不允許/,
  );
  assert.equal(getAvailableActions(application({ status: "完成" }), ROLES.COUNTER).length, 0);
  assert.equal(getAvailableActions(application({ status: "作廢", source: "親臨" }), ROLES.SUPERVISOR).length, 0);
});

test("系統管理員可操作全流程，不限角色，唯終止狀態除外", () => {
  let current = application();
  current = run(current, "submit_initial_review", ROLES.ADMIN);
  assert.equal(current.status, "待複核");
  current = run(current, "complete_review", ROLES.ADMIN);
  assert.equal(current.status, "待審批");
  current = run(current, "approve_sign", ROLES.ADMIN);
  assert.equal(current.status, "已審批");
  current = run(current, "complete_processing", ROLES.ADMIN);
  current = run(current, "print_signed_documents", ROLES.ADMIN);
  current = run(current, "send_pickup_notice", ROLES.ADMIN);
  current = run(current, "record_handover", ROLES.ADMIN);
  assert.equal(current.status, "完成");
  assert.equal(getAvailableActions(current, ROLES.ADMIN).length, 0);

  const counter = run(application({ source: "親臨", status: "待處理" }), "void_case", ROLES.ADMIN);
  assert.equal(counter.status, "作廢");
  assert.equal(getAvailableActions(counter, ROLES.ADMIN).length, 0);
});

test("每次操作都記錄角色、狀態、時間及意見", () => {
  const current = run(application(), "submit_initial_review", ROLES.COUNTER);
  assert.deepEqual(current.history[0], {
    actorRole: ROLES.COUNTER,
    action: "完成初審並送複核",
    fromStatus: "待處理",
    toStatus: "待複核",
    time: "2026-08-27 10:30",
    note: "測試意見",
  });
});
