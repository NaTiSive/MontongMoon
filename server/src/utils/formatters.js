import { Decimal } from "@prisma/client/runtime/library";

const PAYMENT_METHOD_LABELS = {
  cash: "เงินสด",
  bankTransfer: "โอนเงิน",
  creditCard: "บัตรเครดิต",
  other: "อื่นๆ",
};

const TRANSACTION_STATUS_LABELS = {
  pending: "รอการตรวจสอบ",
  approved: "อนุมัติ",
  rejected: "ปฏิเสธ",
};

const TRANSACTION_TYPE_LABELS = {
  income: "รายรับ",
  expense: "รายจ่าย",
};

const ACTIVITY_SCOPE_LABELS = {
  tree: "รายต้น",
  overview: "ภาพรวม",
};

const ACTIVITY_TYPE_LABELS = {
  maintenance: "ดูแลรักษา",
  flowering: "ออกดอก",
  fruiting: "ออกผล",
  harvest: "เก็บเกี่ยว",
  other: "อื่นๆ",
};

const FRUIT_TYPE_LABELS = {
  harvest: "เก็บเกี่ยว",
  export: "ขนส่งออก",
};

export const FRUIT_PROCESS_METHOD_LABELS = {
  fry: "ทอด",
  freeze: "แช่แข็ง",
  jam: "กวน",
  dry: "อบแห้ง",
  other: "อื่นๆ",
};

export const FRUIT_PROCESS_TYPE_CODES = Object.keys(FRUIT_PROCESS_METHOD_LABELS);

const TREE_STATUS_LABELS = {
  normal: "ปกติ",
  flowering: "ออกดอก",
  fruiting: "ออกผล",
};

const PROBLEM_SCOPE_LABELS = {
  tree: "รายต้น",
  overview: "ภาพรวม",
};

const PROBLEM_STATUS_LABELS = {
  pending: "รอพบปัญหา",
  inProgress: "รอการแก้ไข",
  resolved: "แก้ไขแล้ว",
};

const CONTRACT_STATUS_LABELS = {
  pending: "รอการพิจารณา",
  accepted: "ยอมรับ",
  rejected: "ปฏิเสธ",
};

const PAYMENT_TERM_LABELS = {
  cash: "เงินสด",
  bankTransfer: "โอนเงิน",
  installment: "ผ่อนชำระ",
  other: "อื่นๆ",
};

export const FRUIT_GRADE_LABELS = {
  A: "A",
  B: "B",
  C: "C",
  fallen: "ตกเกรด",
};

const EXPORT_STATUS_LABELS = {
  pending: "รอการยืนยันจากเจ้าของสวน",
  confirmed: "ยืนยันแล้ว",
  rejected: "ปฏิเสธแล้ว",
  withdrawn: "ผู้รับเหมาถอนคำขอ",
};

function toNumber(value) {
  if (value == null) return 0;
  if (value instanceof Decimal) return Number(value.toString());
  if (typeof value === "string") return Number(value);
  return Number(value);
}

export function normalizeUserRecord(record, role, approvalStatus = "pending") {
  if (!record) return null;
  const base = {
    id: role === "owner" ? record.ownerId : record.brokerId,
    email: record.email,
    role,
    name: role === "owner" ? record.ownerName : record.brokerName,
    phone: record.phone,
    address: record.address,
    approvalStatus,
  };
  if (role === "broker") {
    base.broker_id = record.brokerId;
  }
  if (role === "owner") {
    base.owner_id = record.ownerId;
  }
  return base;
}

export function mapFruit(record) {
  if (!record) return null;
  const processMethod = FRUIT_PROCESS_METHOD_LABELS[record.type] || null;
  const typeLabel = processMethod
    ? "แปรรูป"
    : FRUIT_TYPE_LABELS[record.type] || record.type;
  return {
    id: record.fruitId,
    fruit_id: record.fruitId,
    tree_id: record.treeId,
    broker_id: record.brokerId ?? null,
    grade: FRUIT_GRADE_LABELS[record.grade] || record.grade,
    type: typeLabel,
    process_method: processMethod,
    process_method_code: processMethod ? record.type : null,
    flow_type: record.type,
    weight_kg: toNumber(record.amount),
    harvest_at: record.date?.toISOString?.() ?? record.date,
    date: record.date?.toISOString?.() ?? record.date,
  };
}

export function mapExportRequest(req) {
  if (!req) return null;
  return {
    id: req.id,
    broker_id: req.brokerId,
    status: EXPORT_STATUS_LABELS[req.status] || req.status,
    created_at: req.createdAt?.toISOString?.() ?? req.createdAt,
    updated_at: req.updatedAt?.toISOString?.() ?? req.updatedAt,
    grades: {
      A: toNumber(req.gradeA),
      B: toNumber(req.gradeB),
      C: toNumber(req.gradeC),
    },
  };
}

export function mapContract(contract) {
  if (!contract) return null;
  const prices = Array.isArray(contract.prices) ? contract.prices : [];
  const priceMap = prices.reduce(
    (acc, price) => {
      acc[price.grade] = toNumber(price.price);
      return acc;
    },
    { A: 0, B: 0, C: 0 }
  );
  return {
    contract_id: contract.contractId,
    broker_id: contract.brokerId,
    owner_id: contract.ownerId,
    status: CONTRACT_STATUS_LABELS[contract.status] || contract.status,
    contract_date: contract.contractDate?.toISOString?.() ?? contract.contractDate,
    qtt_estimate: toNumber(contract.qtyEstimate),
    payment_term: PAYMENT_TERM_LABELS[contract.paymentTerm] || contract.paymentTerm,
    note: contract.note || "",
    offerprice: contract.offerprice || "",
    offerprice_by_grade: {
      A: priceMap.A,
      B: priceMap.B,
      C: priceMap.C,
    },
  };
}

export function mapTransaction(tx) {
  if (!tx) return null;
  return {
    id: tx.accountId,
    transaction_id: tx.accountId,
    broker_id: tx.brokerId ?? null,
    type: TRANSACTION_TYPE_LABELS[tx.type] || tx.type,
    amount: toNumber(tx.amount),
    payment_method: PAYMENT_METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod,
    note: tx.note || "",
    invoice_ref: tx.invoiceRef || null,
    status: TRANSACTION_STATUS_LABELS[tx.status] || tx.status,
    date: tx.date?.toISOString?.() ?? tx.date,
    created_at: tx.date?.toISOString?.() ?? tx.date,
    updated_at: tx.date?.toISOString?.() ?? tx.date,
  };
}

export function mapActivity(act) {
  if (!act) return null;
  return {
    id: act.activityId,
    activity_id: act.activityId,
    broker_id: act.brokerId,
    owner_id: act.ownerId,
    date: act.date?.toISOString?.() ?? act.date,
    type: ACTIVITY_SCOPE_LABELS[act.type] || act.type,
    activity_type: ACTIVITY_TYPE_LABELS[act.activityType] || act.activityType,
    note: act.note || "",
    created_at: act.date?.toISOString?.() ?? act.date,
  };
}

export function mapProblem(problem) {
  if (!problem) return null;
  return {
    id: problem.problemId,
    problem_id: problem.problemId,
    broker_id: problem.brokerId,
    tree_id: problem.treeId,
    owner_id: problem.ownerId,
    type: PROBLEM_SCOPE_LABELS[problem.type] || problem.type,
    note_broker: problem.noteBroker || "",
    note_owner: problem.noteOwner || "",
    status: PROBLEM_STATUS_LABELS[problem.status] || problem.status,
    created_at: null,
    updated_at: null,
  };
}

export function mapTree(tree) {
  if (!tree) return null;
  return {
    id: tree.treeId,
    tree_id: tree.treeId,
    owner_id: tree.ownerId,
    broker_id: tree.brokerId ?? null,
    name: tree.treeId,
    status: TREE_STATUS_LABELS[tree.status] || tree.status,
  };
}

export function toNumberSafe(value) {
  return toNumber(value);
}
