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
  const treeWhere = {};
  if (ownerId != null) treeWhere.ownerId = ownerId;
  if (brokerId) treeWhere.brokerId = brokerId;
  if (treeId) treeWhere.treeId = treeId;

  const dateFilter = buildDateFilter(start, end);
  const fruitWhere = { type: "harvest" };
  if (dateFilter) fruitWhere.date = dateFilter;

  const trees = await prisma.durianTree.findMany({
    where: treeWhere,
    select: {
      fruits: {
        where: fruitWhere,
        select: { grade: true, amount: true },
      },
    },
  });

  const summary = createEmptyGradeSummary();
  for (const tree of trees) {
    for (const fruit of tree.fruits) {
      const label = FRUIT_GRADE_LABELS[fruit.grade] || fruit.grade;
      if (!Object.prototype.hasOwnProperty.call(summary, label)) continue;
      summary[label] += toNumber(fruit.amount);
    }
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
