"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStore = getAdminStore;
exports.recordPayment = recordPayment;
exports.listPayments = listPayments;
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../../db/config");
const schema_1 = require("../../db/schema");
const customer_service_1 = require("../customers/customer.service");
async function getAdminStore(adminId) {
    return config_1.db.query.stores.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.stores.adminId, adminId),
    });
}
async function recordPayment(payload) {
    return config_1.db.transaction(async (tx) => {
        const customer = await tx.query.customers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.storeId, payload.storeId), (0, drizzle_orm_1.eq)(schema_1.customers.id, payload.customerId)),
        });
        if (!customer) {
            throw new Error("CUSTOMER_NOT_FOUND");
        }
        await (0, customer_service_1.ensureBillingPeriodsForCustomer)(customer.id, tx);
        const [payment] = await tx.insert(schema_1.payments).values({
            storeId: payload.storeId,
            customerId: payload.customerId,
            amount: payload.amount,
            unappliedAmount: payload.amount,
            method: payload.method,
            paidAt: payload.paidAt,
            reference: payload.reference?.trim() || null,
            notes: payload.notes?.trim() || null,
        }).returning();
        let remaining = payload.amount;
        const unpaidPeriods = await tx.query.billingPeriods.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPeriods.customerId, customer.id), (0, drizzle_orm_1.eq)(schema_1.billingPeriods.storeId, payload.storeId)),
            orderBy: (table, { asc }) => [asc(table.periodStart)],
        });
        for (const period of unpaidPeriods.filter(period => period.balance > 0)) {
            if (remaining <= 0)
                break;
            const allocationAmount = Math.min(remaining, period.balance);
            const amountPaid = period.amountPaid + allocationAmount;
            const balance = period.amountDue - amountPaid;
            await tx.insert(schema_1.paymentAllocations).values({
                paymentId: payment.id,
                billingPeriodId: period.id,
                amount: allocationAmount,
            });
            await tx.update(schema_1.billingPeriods).set({
                amountPaid,
                balance,
                status: balance <= 0 ? "paid" : "partial",
                updatedAt: new Date(),
            }).where((0, drizzle_orm_1.eq)(schema_1.billingPeriods.id, period.id));
            remaining -= allocationAmount;
        }
        await tx.update(schema_1.payments).set({
            unappliedAmount: remaining,
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, payment.id));
        if (remaining > 0) {
            await tx.update(schema_1.customers).set({
                creditBalance: (0, drizzle_orm_1.sql) `${schema_1.customers.creditBalance} + ${remaining}`,
                updatedAt: new Date(),
            }).where((0, drizzle_orm_1.eq)(schema_1.customers.id, customer.id));
        }
        await (0, customer_service_1.refreshBillingStatuses)(customer.id, tx);
        return tx.query.payments.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.payments.id, payment.id),
            with: { allocations: true },
        });
    });
}
async function listPayments(storeId, options) {
    const filters = [(0, drizzle_orm_1.eq)(schema_1.payments.storeId, storeId)];
    if (options.customerId) {
        filters.push((0, drizzle_orm_1.eq)(schema_1.payments.customerId, options.customerId));
    }
    if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
        const start = new Date(`${options.month}-01T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        filters.push((0, drizzle_orm_1.gte)(schema_1.payments.paidAt, start), (0, drizzle_orm_1.lt)(schema_1.payments.paidAt, end));
    }
    const rows = await config_1.db.query.payments.findMany({
        where: (0, drizzle_orm_1.and)(...filters),
        with: {
            customer: true,
            allocations: {
                with: {
                    billingPeriod: true,
                },
            },
        },
        orderBy: (table, { desc }) => [desc(table.paidAt)],
    });
    const total = rows.reduce((sum, payment) => sum + payment.amount, 0);
    const unappliedTotal = rows.reduce((sum, payment) => sum + payment.unappliedAmount, 0);
    return { payments: rows, totals: { total, unappliedTotal } };
}
