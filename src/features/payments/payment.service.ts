import { and, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "../../db/config";
import { billingPeriods, customers, paymentAllocations, payments, stores } from "../../db/schema";
import { ensureBillingPeriodsForCustomer, refreshBillingStatuses } from "../customers/customer.service";

export type PaymentMethod = "cash" | "bank" | "easypaisa";

export type RecordPaymentPayload = {
  storeId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  reference?: string;
  notes?: string;
};

export async function getAdminStore(adminId: string) {
  return db.query.stores.findFirst({
    where: eq(stores.adminId, adminId),
  });
}

export async function recordPayment(payload: RecordPaymentPayload) {
  return db.transaction(async (tx) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.storeId, payload.storeId), eq(customers.id, payload.customerId)),
    });

    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    await ensureBillingPeriodsForCustomer(customer.id, tx);

    const [payment] = await tx.insert(payments).values({
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
      where: and(eq(billingPeriods.customerId, customer.id), eq(billingPeriods.storeId, payload.storeId)),
      orderBy: (table, { asc }) => [asc(table.periodStart)],
    });

    for (const period of unpaidPeriods.filter(period => period.balance > 0)) {
      if (remaining <= 0) break;

      const allocationAmount = Math.min(remaining, period.balance);
      const amountPaid = period.amountPaid + allocationAmount;
      const balance = period.amountDue - amountPaid;

      await tx.insert(paymentAllocations).values({
        paymentId: payment.id,
        billingPeriodId: period.id,
        amount: allocationAmount,
      });
      await tx.update(billingPeriods).set({
        amountPaid,
        balance,
        status: balance <= 0 ? "paid" : "partial",
        updatedAt: new Date(),
      }).where(eq(billingPeriods.id, period.id));

      remaining -= allocationAmount;
    }

    await tx.update(payments).set({
      unappliedAmount: remaining,
      updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));

    if (remaining > 0) {
      await tx.update(customers).set({
        creditBalance: sql`${customers.creditBalance} + ${remaining}`,
        updatedAt: new Date(),
      }).where(eq(customers.id, customer.id));
    }

    await refreshBillingStatuses(customer.id, tx);

    return tx.query.payments.findFirst({
      where: eq(payments.id, payment.id),
      with: { allocations: true },
    });
  });
}

export async function listPayments(storeId: string, options: { month?: string; customerId?: string }) {
  const filters = [eq(payments.storeId, storeId)];

  if (options.customerId) {
    filters.push(eq(payments.customerId, options.customerId));
  }

  if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const start = new Date(`${options.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    filters.push(gte(payments.paidAt, start), lt(payments.paidAt, end));
  }

  const rows = await db.query.payments.findMany({
    where: and(...filters),
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
