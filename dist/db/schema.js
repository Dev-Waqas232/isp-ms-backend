"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentAllocationsRelations = exports.paymentsRelations = exports.billingPeriodsRelations = exports.customersRelations = exports.plansRelations = exports.storesRelations = exports.usersRelations = exports.paymentAllocations = exports.payments = exports.billingPeriods = exports.customers = exports.plans = exports.stores = exports.users = exports.paymentMethodEnum = exports.billingStatusEnum = exports.customerStatusEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
exports.customerStatusEnum = (0, pg_core_1.pgEnum)("customer_status", ["active", "inactive"]);
exports.billingStatusEnum = (0, pg_core_1.pgEnum)("billing_status", ["pending", "partial", "paid", "overdue"]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)("payment_method", ["cash", "bank", "easypaisa"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull(),
    password: (0, pg_core_1.varchar)("password", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.stores = (0, pg_core_1.pgTable)("stores", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    adminId: (0, pg_core_1.uuid)("admin_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    providerName: (0, pg_core_1.varchar)("provider_name", { length: 255 }).notNull(),
    contactNumber: (0, pg_core_1.varchar)("contact_number", { length: 50 }).notNull(),
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.varchar)("city", { length: 120 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    logoUrl: (0, pg_core_1.text)("logo_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.plans = (0, pg_core_1.pgTable)("plans", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    storeId: (0, pg_core_1.uuid)("store_id")
        .notNull()
        .references(() => exports.stores.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    price: (0, pg_core_1.integer)("price").notNull(),
    description: (0, pg_core_1.text)("description"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
}, table => ({
    planNamePerStore: (0, pg_core_1.uniqueIndex)("plans_store_name_unique").on(table.storeId, table.name),
}));
exports.customers = (0, pg_core_1.pgTable)("customers", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    storeId: (0, pg_core_1.uuid)("store_id")
        .notNull()
        .references(() => exports.stores.id, { onDelete: "cascade" }),
    planId: (0, pg_core_1.uuid)("plan_id")
        .notNull()
        .references(() => exports.plans.id),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    username: (0, pg_core_1.varchar)("username", { length: 120 }).notNull(),
    phoneNumber: (0, pg_core_1.varchar)("phone_number", { length: 50 }).notNull(),
    address: (0, pg_core_1.text)("address"),
    activationDate: (0, pg_core_1.date)("activation_date").notNull(),
    expirationDate: (0, pg_core_1.date)("expiration_date").notNull(),
    status: (0, exports.customerStatusEnum)("status").notNull().default("active"),
    creditBalance: (0, pg_core_1.integer)("credit_balance").notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
}, table => ({
    customerUsernamePerStore: (0, pg_core_1.uniqueIndex)("customers_store_username_unique").on(table.storeId, table.username),
}));
exports.billingPeriods = (0, pg_core_1.pgTable)("billing_periods", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    storeId: (0, pg_core_1.uuid)("store_id")
        .notNull()
        .references(() => exports.stores.id, { onDelete: "cascade" }),
    customerId: (0, pg_core_1.uuid)("customer_id")
        .notNull()
        .references(() => exports.customers.id, { onDelete: "cascade" }),
    planId: (0, pg_core_1.uuid)("plan_id")
        .notNull()
        .references(() => exports.plans.id),
    periodStart: (0, pg_core_1.date)("period_start").notNull(),
    periodEnd: (0, pg_core_1.date)("period_end").notNull(),
    amountDue: (0, pg_core_1.integer)("amount_due").notNull(),
    amountPaid: (0, pg_core_1.integer)("amount_paid").notNull().default(0),
    balance: (0, pg_core_1.integer)("balance").notNull(),
    status: (0, exports.billingStatusEnum)("status").notNull().default("pending"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
}, table => ({
    billingPeriodPerCustomer: (0, pg_core_1.unique)("billing_periods_customer_start_unique").on(table.customerId, table.periodStart),
}));
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    storeId: (0, pg_core_1.uuid)("store_id")
        .notNull()
        .references(() => exports.stores.id, { onDelete: "cascade" }),
    customerId: (0, pg_core_1.uuid)("customer_id")
        .notNull()
        .references(() => exports.customers.id, { onDelete: "cascade" }),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    unappliedAmount: (0, pg_core_1.integer)("unapplied_amount").notNull().default(0),
    method: (0, exports.paymentMethodEnum)("method").notNull(),
    paidAt: (0, pg_core_1.timestamp)("paid_at", { withTimezone: true }).notNull(),
    reference: (0, pg_core_1.varchar)("reference", { length: 255 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.paymentAllocations = (0, pg_core_1.pgTable)("payment_allocations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    paymentId: (0, pg_core_1.uuid)("payment_id")
        .notNull()
        .references(() => exports.payments.id, { onDelete: "cascade" }),
    billingPeriodId: (0, pg_core_1.uuid)("billing_period_id")
        .notNull()
        .references(() => exports.billingPeriods.id, { onDelete: "cascade" }),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    stores: many(exports.stores),
}));
exports.storesRelations = (0, drizzle_orm_1.relations)(exports.stores, ({ one, many }) => ({
    admin: one(exports.users, {
        fields: [exports.stores.adminId],
        references: [exports.users.id],
    }),
    plans: many(exports.plans),
    customers: many(exports.customers),
    payments: many(exports.payments),
}));
exports.plansRelations = (0, drizzle_orm_1.relations)(exports.plans, ({ one, many }) => ({
    store: one(exports.stores, {
        fields: [exports.plans.storeId],
        references: [exports.stores.id],
    }),
    customers: many(exports.customers),
    billingPeriods: many(exports.billingPeriods),
}));
exports.customersRelations = (0, drizzle_orm_1.relations)(exports.customers, ({ one, many }) => ({
    store: one(exports.stores, {
        fields: [exports.customers.storeId],
        references: [exports.stores.id],
    }),
    plan: one(exports.plans, {
        fields: [exports.customers.planId],
        references: [exports.plans.id],
    }),
    billingPeriods: many(exports.billingPeriods),
    payments: many(exports.payments),
}));
exports.billingPeriodsRelations = (0, drizzle_orm_1.relations)(exports.billingPeriods, ({ one, many }) => ({
    store: one(exports.stores, {
        fields: [exports.billingPeriods.storeId],
        references: [exports.stores.id],
    }),
    customer: one(exports.customers, {
        fields: [exports.billingPeriods.customerId],
        references: [exports.customers.id],
    }),
    plan: one(exports.plans, {
        fields: [exports.billingPeriods.planId],
        references: [exports.plans.id],
    }),
    allocations: many(exports.paymentAllocations),
}));
exports.paymentsRelations = (0, drizzle_orm_1.relations)(exports.payments, ({ one, many }) => ({
    store: one(exports.stores, {
        fields: [exports.payments.storeId],
        references: [exports.stores.id],
    }),
    customer: one(exports.customers, {
        fields: [exports.payments.customerId],
        references: [exports.customers.id],
    }),
    allocations: many(exports.paymentAllocations),
}));
exports.paymentAllocationsRelations = (0, drizzle_orm_1.relations)(exports.paymentAllocations, ({ one }) => ({
    payment: one(exports.payments, {
        fields: [exports.paymentAllocations.paymentId],
        references: [exports.payments.id],
    }),
    billingPeriod: one(exports.billingPeriods, {
        fields: [exports.paymentAllocations.billingPeriodId],
        references: [exports.billingPeriods.id],
    }),
}));
