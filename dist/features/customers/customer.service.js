"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStore = getAdminStore;
exports.addDays = addDays;
exports.ensureBillingPeriodsForCustomer = ensureBillingPeriodsForCustomer;
exports.refreshBillingStatuses = refreshBillingStatuses;
exports.getCustomerSummary = getCustomerSummary;
exports.listCustomers = listCustomers;
exports.createCustomer = createCustomer;
exports.getCustomerById = getCustomerById;
exports.updateCustomer = updateCustomer;
exports.listCustomerBillingPeriods = listCustomerBillingPeriods;
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../../db/config");
const schema_1 = require("../../db/schema");
async function getAdminStore(adminId) {
    return config_1.db.query.stores.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.stores.adminId, adminId),
    });
}
function addDays(dateValue, days) {
    const date = new Date(`${dateValue}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
function todayString() {
    return new Date().toISOString().slice(0, 10);
}
function getBillingStatus(balance, amountPaid, periodEnd) {
    if (balance <= 0)
        return "paid";
    if (periodEnd < todayString())
        return "overdue";
    if (amountPaid > 0)
        return "partial";
    return "pending";
}
async function applyCreditToPeriod(customerId, periodId, amountDue, tx) {
    const client = tx || config_1.db;
    const customer = await client.query.customers.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId),
    });
    if (!customer || customer.creditBalance <= 0) {
        return;
    }
    const creditToApply = Math.min(customer.creditBalance, amountDue);
    const balance = amountDue - creditToApply;
    const currentPeriod = await client.query.billingPeriods.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.billingPeriods.id, periodId)
    });
    await client.update(schema_1.billingPeriods)
        .set({
        amountPaid: creditToApply,
        balance,
        status: getBillingStatus(balance, creditToApply, currentPeriod?.periodEnd ?? todayString()),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.billingPeriods.id, periodId));
    await client.update(schema_1.customers)
        .set({
        creditBalance: (0, drizzle_orm_1.sql) `${schema_1.customers.creditBalance} - ${creditToApply}`,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, customerId));
}
async function createBillingPeriod(payload, tx) {
    const client = tx || config_1.db;
    const periodEnd = addDays(payload.periodStart, 30);
    const [period] = await client.insert(schema_1.billingPeriods).values({
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
    await applyCreditToPeriod(payload.customerId, period.id, payload.amountDue, tx);
    return period;
}
async function ensureBillingPeriodsForCustomer(customerId, tx) {
    const client = tx || config_1.db;
    const customer = await client.query.customers.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId),
        with: { plan: true },
    });
    if (!customer || customer.status !== "active") {
        return;
    }
    const existingLatest = await client.query.billingPeriods.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.billingPeriods.customerId, customer.id),
        orderBy: (table, { desc }) => [desc(table.periodStart)],
    });
    let latestPeriod;
    if (!existingLatest || existingLatest.periodEnd <= customer.activationDate) {
        const alreadyExists = existingLatest && existingLatest.periodStart === customer.activationDate;
        latestPeriod = alreadyExists ? existingLatest : await createBillingPeriod({
            storeId: customer.storeId,
            customerId: customer.id,
            planId: customer.planId,
            periodStart: customer.activationDate,
            amountDue: customer.plan.price,
        }, tx);
    }
    else {
        latestPeriod = existingLatest;
    }
    while (latestPeriod.periodEnd <= todayString()) {
        const nextStart = latestPeriod.periodEnd;
        const existing = await client.query.billingPeriods.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPeriods.customerId, customer.id), (0, drizzle_orm_1.eq)(schema_1.billingPeriods.periodStart, nextStart)),
        });
        latestPeriod = existing ?? await createBillingPeriod({
            storeId: customer.storeId,
            customerId: customer.id,
            planId: customer.planId,
            periodStart: nextStart,
            amountDue: customer.plan.price,
        }, tx);
    }
    await refreshBillingStatuses(customer.id, tx);
}
async function refreshBillingStatuses(customerId, tx) {
    const client = tx || config_1.db;
    const periods = await client.query.billingPeriods.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.billingPeriods.customerId, customerId),
    });
    await Promise.all(periods.map((period) => client.update(schema_1.billingPeriods).set({
        status: getBillingStatus(period.balance, period.amountPaid, period.periodEnd),
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema_1.billingPeriods.id, period.id))));
}
async function getCustomerSummary(customerId) {
    await ensureBillingPeriodsForCustomer(customerId);
    const periods = await config_1.db.query.billingPeriods.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.billingPeriods.customerId, customerId),
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
async function listCustomers(storeId, options) {
    const statusFilter = options.status === "all" ? undefined : (0, drizzle_orm_1.eq)(schema_1.customers.status, options.status ?? "active");
    const searchFilter = options.search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.name, `%${options.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.username, `%${options.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phoneNumber, `%${options.search}%`))
        : undefined;
    const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.storeId, storeId), statusFilter, searchFilter);
    const offset = (options.page - 1) * options.limit;
    const rows = await config_1.db.query.customers.findMany({
        where,
        with: { plan: true },
        limit: options.limit,
        offset,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    const [{ count }] = await config_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.customers).where(where);
    const enriched = await Promise.all(rows.map(async (customer) => ({
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
async function createCustomer(payload) {
    const plan = await config_1.db.query.plans.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.plans.storeId, payload.storeId), (0, drizzle_orm_1.eq)(schema_1.plans.id, payload.planId), (0, drizzle_orm_1.eq)(schema_1.plans.isActive, true)),
    });
    if (!plan) {
        throw new Error("PLAN_NOT_FOUND");
    }
    const expirationDate = addDays(payload.activationDate, 30);
    const [customer] = await config_1.db.insert(schema_1.customers).values({
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
async function getCustomerById(storeId, customerId) {
    const customer = await config_1.db.query.customers.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId)),
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
async function updateCustomer(storeId, customerId, payload) {
    const currentCustomer = await config_1.db.query.customers.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId)),
    });
    if (!currentCustomer) {
        return null;
    }
    let activationDate = payload.activationDate;
    let expirationDate = payload.activationDate !== undefined ? addDays(payload.activationDate, 30) : undefined;
    if (payload.status === "active" && currentCustomer.status === "inactive") {
        const today = new Date().toISOString().slice(0, 10);
        activationDate = activationDate ?? today;
        expirationDate = addDays(activationDate, 30);
    }
    const [customer] = await config_1.db.update(schema_1.customers).set({
        ...(payload.planId !== undefined ? { planId: payload.planId } : {}),
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.username !== undefined ? { username: payload.username.trim() } : {}),
        ...(payload.phoneNumber !== undefined ? { phoneNumber: payload.phoneNumber.trim() } : {}),
        ...(payload.address !== undefined ? { address: payload.address?.trim() || null } : {}),
        ...(activationDate !== undefined ? { activationDate, expirationDate } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId))).returning();
    return customer;
}
async function listCustomerBillingPeriods(customerId) {
    await ensureBillingPeriodsForCustomer(customerId);
    return config_1.db.query.billingPeriods.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.billingPeriods.customerId, customerId),
        orderBy: (table, { asc }) => [asc(table.periodStart)],
    });
}
