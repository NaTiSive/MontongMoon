import prisma from "../config/prisma.js";
import {
  FRUIT_GRADE_LABELS,
  FRUIT_PROCESS_TYPE_CODES,
  toNumberSafe,
} from "./formatters.js";

const GRADE_LABELS = Object.values(FRUIT_GRADE_LABELS);

function createEmptyGradeSummary() {
  return Object.fromEntries(GRADE_LABELS.map((label) => [label, 0]));
}

const toNumber = (value) => toNumberSafe(value);

function buildDateFilter(start, end) {
  if (!start && !end) return undefined;
  const range = {};
  if (start) range.gte = start;
  if (end) range.lte = end;
  return range;
}

export async function sumHarvestByGrade({ ownerId = 1, brokerId = null, treeId = null, start = null, end = null } = {}) {
  const where = { type: "harvest" };
  if (ownerId != null) where.ownerId = ownerId;
  if (brokerId) where.brokerId = brokerId;
  if (treeId) where.treeId = treeId;

  const dateFilter = buildDateFilter(start, end);
  if (dateFilter) where.date = dateFilter;

  const grouped = await prisma.durianFruit.groupBy({
    by: ["grade"],
    _sum: { amount: true },
    where,
  });

  const summary = createEmptyGradeSummary();
  for (const row of grouped) {
    const label = FRUIT_GRADE_LABELS[row.grade] || row.grade;
    if (!Object.prototype.hasOwnProperty.call(summary, label)) continue;
    summary[label] += toNumber(row._sum?.amount);
  }

  const normalized = Object.fromEntries(
    Object.entries(summary).map(([label, value]) => [label, Number(value) || 0])
  );
  const sum_weight = Object.values(normalized).reduce((acc, value) => acc + value, 0);
  return { sum_weight, by_grade: normalized };
}

export async function computeNetStockByGrade({ ownerId = 1, brokerId = null, start = null, end = null } = {}) {
  const where = {};
  if (ownerId != null) where.ownerId = ownerId;
  if (brokerId) where.brokerId = brokerId;
  const dateFilter = buildDateFilter(start, end);
  if (dateFilter) where.date = dateFilter;

  const grouped = await prisma.durianFruit.groupBy({
    by: ["grade", "type"],
    _sum: { amount: true },
    where,
  });

  const summary = createEmptyGradeSummary();
  for (const row of grouped) {
    const label = FRUIT_GRADE_LABELS[row.grade] || row.grade;
    const amount = toNumber(row._sum?.amount);
    if (row.type === "harvest") {
      summary[label] += amount;
    } else if (row.type === "export" || FRUIT_PROCESS_TYPE_CODES.includes(row.type)) {
      summary[label] -= amount;
    }
  }

  const normalized = Object.fromEntries(
    Object.entries(summary).map(([label, value]) => [label, Math.max(0, Number(value) || 0)])
  );
  const sum_weight = Object.values(normalized).reduce((acc, value) => acc + value, 0);
  return { sum_weight, by_grade: normalized };
}
