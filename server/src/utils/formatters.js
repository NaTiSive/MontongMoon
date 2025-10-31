import { Decimal } from "@prisma/client/runtime/library";

function toNumber(value) {
  if (value == null) return 0;
  if (value instanceof Decimal) return Number(value.toString());
  if (typeof value === "string") return Number(value);
  return Number(value);
}

export function mapUser(user) {
  if (!user) return null;
  const base = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone,
    address: user.address,
    approvalStatus: user.approvalStatus,
    created_at: user.createdAt?.toISOString?.() ?? user.createdAt,
    updated_at: user.updatedAt?.toISOString?.() ?? user.updatedAt,
  };
  if (user.role === "broker") base.broker_id = user.id;
  if (user.role === "owner") base.owner_id = user.id;
  return base;
}

export function mapFruit(record) {
  if (!record) return null;
  return {
    id: record.id,
    broker_id: record.brokerId ?? null,
    grade: record.grade,
    type: record.type,
    weight_kg: toNumber(record.weightKg),
    note: record.note || "",
    process_method: record.processMethod || null,
    harvest_at: record.harvestAt?.toISOString?.() ?? record.harvestAt,
    created_at: record.createdAt?.toISOString?.() ?? record.createdAt,
  };
}

export function mapExportRequest(req) {
  if (!req) return null;
  return {
    id: req.id,
    broker_id: req.brokerId,
    status: req.status,
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
  return {
    contract_id: contract.id,
    broker_id: contract.brokerId,
    owner_id: contract.ownerId,
    status: contract.status,
    contract_date: contract.contractDate?.toISOString?.() ?? contract.contractDate,
    contract_deadline: contract.contractDeadline?.toISOString?.() ?? contract.contractDeadline,
    qtt_estimate: toNumber(contract.qtyEstimate),
    payment_term: contract.paymentTerm || "",
    note: contract.note || "",
    offerprice: toNumber(contract.priceGradeA),
    offerprice_by_grade: {
      A: toNumber(contract.priceGradeA),
      B: toNumber(contract.priceGradeB),
      C: toNumber(contract.priceGradeC),
    },
  };
}

export function mapTransaction(tx) {
  if (!tx) return null;
  return {
    id: tx.id,
    broker_id: tx.brokerId ?? null,
    type: tx.type,
    amount: toNumber(tx.amount),
    payment_method: tx.paymentMethod,
    note: tx.note || "",
    invoice_ref: tx.invoiceRef || null,
    status: tx.status,
    created_at: tx.createdAt?.toISOString?.() ?? tx.createdAt,
    updated_at: tx.updatedAt?.toISOString?.() ?? tx.updatedAt,
    receipt: tx.receiptName
      ? {
          name: tx.receiptName,
          mime: tx.receiptMime,
          dataUrl: tx.receiptDataUrl,
        }
      : null,
  };
}

export function mapActivity(act) {
  if (!act) return null;
  return {
    id: act.id,
    broker_id: act.brokerId,
    tree_id: act.treeId,
    type: act.type,
    note: act.note || "",
    created_at: act.createdAt?.toISOString?.() ?? act.createdAt,
  };
}

export function mapProblem(problem) {
  if (!problem) return null;
  return {
    id: problem.id,
    broker_id: problem.brokerId,
    tree_id: problem.treeId,
    type: problem.type,
    note_broker: problem.noteBroker || "",
    owner_note: problem.ownerNote || "",
    status: problem.status,
    created_at: problem.createdAt?.toISOString?.() ?? problem.createdAt,
    updated_at: problem.updatedAt?.toISOString?.() ?? problem.updatedAt,
  };
}

export function mapTree(tree) {
  if (!tree) return null;
  return {
    id: tree.id,
    tree_id: tree.id,
    name: tree.name,
    status: tree.status,
    created_at: tree.createdAt?.toISOString?.() ?? tree.createdAt,
    updated_at: tree.updatedAt?.toISOString?.() ?? tree.updatedAt,
  };
}

export function toNumberSafe(value) {
  return toNumber(value);
}
