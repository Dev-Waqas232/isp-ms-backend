import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../../db/config";
import { billingPeriods, customers, plans, stores } from "../../db/schema";

export type CreateCustomerPayload = {
  storeId: string;
  planId: string;
  name: string;
  username: string;
  phoneNumber: string;
  address?: string;
  activationDate: string;
};

export type UpdateCustomerPayload = {
  planId?: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  address?: string | null;
  activationDate?: string;
  status?: "active" | "inactive";
};

type BillingStatus = "pending" | "partial" | "paid" | "overdue";
type BillingPeriodRow = typeof billingPeriods.$inferSelect;

export async function getAdminStore(adminId: string) {
  return db.query.stores.findFirst({
    where: eq(stores.adminId, adminId),
  });
}

export function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function getBillingStatus(balance: number, amountPaid: number, periodEnd: string): BillingStatus {
  if (balance <= 0) return "paid";
  if (periodEnd < todayString()) return "overdue";
  if (amountPaid > 0) return "partial";
  return "pending";
}

async function applyCreditToPeriod(customerId: string, periodId: string, amountDue: number) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer || customer.creditBalance <= 0) {
    return;
  }

  const creditToApply = Math.min(customer.creditBalance, amountDue);
  const balance = amountDue - creditToApply;

  await db.update(billingPeriods)
    .set({
      amountPaid: creditToApply,
      balance,
      status: getBillingStatus(balance, creditToApply, (await db.query.billingPeriods.findFirst({ where: eq(billingPeriods.id, periodId) }))?.periodEnd ?? todayString()),
      updatedAt: new Date(),
    })
    .where(eq(billingPeriods.id, periodId));

  await db.update(customers)
    .set({
      creditBalance: customer.creditBalance - creditToApply,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));
}

async function createBillingPeriod(payload: {
  storeId: string;
  customerId: string;
  planId: string;
  periodStart: string;
  amountDue: number;
}) {
  const periodEnd = addDays(payload.periodStart, 30);
  const [period] = await db.insert(billingPeriods).values({
    storeId: payload.storeId,
    customerId: payload.customerId,
    planId: payload.planId,
    periodStart: payload.periodStart,
    periodEnd,
    amountDue: payload.amountDue,
    amountPaid: 0,
    balance: payload.amountDue,
    status: getBillingStatus(payload.amountDue, 0, periodEnd),
  }).returning();

  await applyCreditToPeriod(payload.customerId, period.id, payload.amountDue);

  return period;
}

export async function ensureBillingPeriodsForCustomer(customerId: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
    with: { plan: true },
  });

  if (!customer || customer.status !== "active") {
    return;
  }

  const existingLatest = await db.query.billingPeriods.findFirst({
    where: eq(billingPeriods.customerId, customer.id),
    orderBy: (table, { desc }) => [desc(table.periodStart)],
  });

  let latestPeriod: BillingPeriodRow = existingLatest ?? await createBillingPeriod({
    storeId: customer.storeId,
    customerId: customer.id,
    planId: customer.planId,
    periodStart: customer.activationDate,
    amountDue: customer.plan.price,
  });

  while (latestPeriod.periodEnd <= todayString()) {
    const nextStart: string = latestPeriod.periodEnd;
    const existing: BillingPeriodRow | undefined = await db.query.billingPeriods.findFirst({
      where: and(eq(billingPeriods.customerId, customer.id), eq(billingPeriods.periodStart, nextStart)),
    });

    latestPeriod = existing ?? await createBillingPeriod({
      storeId: customer.storeId,
      customerId: customer.id,
      planId: customer.planId,
      periodStart: nextStart,
      amountDue: customer.plan.price,
    });
  }

  await refreshBillingStatuses(customer.id);
}

export async function refreshBillingStatuses(customerId: string) {
  const periods = await db.query.billingPeriods.findMany({
    where: eq(billingPeriods.customerId, customerId),
  });

  await Promise.all(periods.map(period => db.update(billingPeriods).set({
    status: getBillingStatus(period.balance, period.amountPaid, period.periodEnd),
    updatedAt: new Date(),
  }).where(eq(billingPeriods.id, period.id))));
}

export async function getCustomerSummary(customerId: string) {
  await ensureBillingPeriodsForCustomer(customerId);

  const periods = await db.query.billingPeriods.findMany({
    where: eq(billingPeriods.customerId, customerId),
    orderBy: (table, { desc }) => [desc(table.periodStart)],
  });

  const currentPeriod = periods.find(period => period.periodStart <= todayString() && period.periodEnd > todayString()) ?? periods[0] ?? null;
  const totalOutstanding = periods.reduce((sum, period) => sum + Math.max(period.balance, 0), 0);

  return {
    currentPeriod,
    totalOutstanding,
    paymentStatus: currentPeriod?.status ?? "pending",
  };
}

export async function listCustomers(storeId: string, options: { page: number; limit: number; search?: string; status?: "active" | "inactive" | "all" }) {
  const statusFilter = options.status === "all" ? undefined : eq(customers.status, options.status ?? "active");
  const searchFilter = options.search
    ? or(
      ilike(customers.name, `%${options.search}%`),
      ilike(customers.username, `%${options.search}%`),
      ilike(customers.phoneNumber, `%${options.search}%`),
    )
    : undefined;
  const where = and(eq(customers.storeId, storeId), statusFilter, searchFilter);
  const offset = (options.page - 1) * options.limit;

  const rows = await db.query.customers.findMany({
    where,
    with: { plan: true },
    limit: options.limit,
    offset,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(customers).where(where);

  const enriched = await Promise.all(rows.map(async customer => ({
    ...customer,
    ...(await getCustomerSummary(customer.id)),
  })));

  return {
    customers: enriched,
    pagination: {
      page: options.page,
      limit: options.limit,
      total: Number(count),
      totalPages: Math.max(1, Math.ceil(Number(count) / options.limit)),
    },
  };
}

export async function createCustomer(payload: CreateCustomerPayload) {
  const plan = await db.query.plans.findFirst({
    where: and(eq(plans.storeId, payload.storeId), eq(plans.id, payload.planId), eq(plans.isActive, true)),
  });

  if (!plan) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const expirationDate = addDays(payload.activationDate, 30);
  const [customer] = await db.insert(customers).values({
    storeId: payload.storeId,
    planId: payload.planId,
    name: payload.name.trim(),
    username: payload.username.trim(),
    phoneNumber: payload.phoneNumber.trim(),
    address: payload.address?.trim() || null,
    activationDate: payload.activationDate,
    expirationDate,
  }).returning();

  await createBillingPeriod({
    storeId: payload.storeId,
    customerId: customer.id,
    planId: payload.planId,
    periodStart: payload.activationDate,
    amountDue: plan.price,
  });

  return customer;
}

export async function getCustomerById(storeId: string, customerId: string) {
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.storeId, storeId), eq(customers.id, customerId)),
    with: {
      plan: true,
      billingPeriods: {
        orderBy: (table, { desc }) => [desc(table.periodStart)],
      },
      payments: {
        orderBy: (table, { desc }) => [desc(table.paidAt)],
      },
    },
  });

  if (!customer) {
    return null;
  }

  return {
    ...customer,
    ...(await getCustomerSummary(customer.id)),
  };
}

export async function updateCustomer(storeId: string, customerId: string, payload: UpdateCustomerPayload) {
  const [customer] = await db.update(customers).set({
    ...(payload.planId !== undefined ? { planId: payload.planId } : {}),
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.username !== undefined ? { username: payload.username.trim() } : {}),
    ...(payload.phoneNumber !== undefined ? { phoneNumber: payload.phoneNumber.trim() } : {}),
    ...(payload.address !== undefined ? { address: payload.address?.trim() || null } : {}),
    ...(payload.activationDate !== undefined ? { activationDate: payload.activationDate, expirationDate: addDays(payload.activationDate, 30) } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    updatedAt: new Date(),
  }).where(and(eq(customers.storeId, storeId), eq(customers.id, customerId))).returning();

  return customer;
}

export async function listCustomerBillingPeriods(customerId: string) {
  await ensureBillingPeriodsForCustomer(customerId);

  return db.query.billingPeriods.findMany({
    where: eq(billingPeriods.customerId, customerId),
    orderBy: (table, { asc }) => [asc(table.periodStart)],
  });
}
