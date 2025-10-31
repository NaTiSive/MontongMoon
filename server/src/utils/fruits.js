import prisma from "../config/prisma.js";
import { FruitFlowType } from "@prisma/client";
import {
  FRUIT_GRADE_LABELS,
  FRUIT_PROCESS_TYPE_CODES,
  normalizeFruitFlowCode,
  toNumberSafe,
} from "./formatters.js";

const GRADE_LABELS = Object.values(FRUIT_GRADE_LABELS);
const HARVEST_CODE = normalizeFruitFlowCode(FruitFlowType.harvest);
const EXPORT_CODE = normalizeFruitFlowCode(FruitFlowType.export);
const PROCESS_TYPE_SET = new Set(
  FRUIT_PROCESS_TYPE_CODES.map((code) => normalizeFruitFlowCode(code))
);

function createEmptyGradeSummary() {
  return Object.fromEntries(GRADE_LABELS.map((label) => [label, 0]));
}

const toNumber = (value) => toNumberSafe(value);

function normalizeOwnerId(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildDateFilter(start, end) {
  if (!start && !end) return undefined;
  const range = {};
  if (start) range.gte = start;
  if (end) range.lte = end;
  return range;
}

export async function sumHarvestByGrade({ ownerId = null, brokerId = null, treeId = null, start = null, end = null } = {}) {
  const where = { type: FruitFlowType.harvest };
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  if (normalizedOwnerId !== null) where.ownerId = normalizedOwnerId;
  if (brokerId) where.brokerId = brokerId;
  if (treeId) where.treeId = treeId;

  const dateFilter = buildDateFilter(start, end);
  if (dateFilter) where.date = dateFilter;

  const records = await prisma.durianFruit.findMany({
    where,
    select: { grade: true, amount: true },
  });

  const summary = createEmptyGradeSummary();
  for (const record of records) {
    const label = FRUIT_GRADE_LABELS[record.grade] || record.grade;
    if (!Object.prototype.hasOwnProperty.call(summary, label)) continue;
    summary[label] += toNumber(record.amount);
  }

  const normalized = Object.fromEntries(
    Object.entries(summary).map(([label, value]) => [label, Number(value) || 0])
  );
  const sum_weight = Object.values(normalized).reduce((acc, value) => acc + value, 0);
  return { sum_weight, by_grade: normalized };
}

export async function computeNetStockByGrade({ ownerId = null, brokerId = null, start = null, end = null } = {}) {
  const where = {};
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  if (normalizedOwnerId !== null) where.ownerId = normalizedOwnerId;
  if (brokerId) where.brokerId = brokerId;
  const dateFilter = buildDateFilter(start, end);
  if (dateFilter) where.date = dateFilter;

  const records = await prisma.durianFruit.findMany({
    where,
    select: { grade: true, amount: true, type: true },
  });

  const summary = createEmptyGradeSummary();
  for (const record of records) {
    const label = FRUIT_GRADE_LABELS[record.grade] || record.grade;
    if (!Object.prototype.hasOwnProperty.call(summary, label)) continue;

    const weight = toNumber(record.amount);
    const flow = normalizeFruitFlowCode(record.type);
    if (flow === HARVEST_CODE) {
      summary[label] += weight;
    } else if (flow === EXPORT_CODE || PROCESS_TYPE_SET.has(flow)) {
      summary[label] -= weight;
    }
  }

  const normalized = Object.fromEntries(
    Object.entries(summary).map(([label, value]) => [label, Math.max(0, Number(value) || 0)])
  );
  const sum_weight = Object.values(normalized).reduce((acc, value) => acc + value, 0);
  return { sum_weight, by_grade: normalized };
}
