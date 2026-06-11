import { relations } from "drizzle-orm";
import {
  pgTable,
  boolean,
  date,
  integer,
  pgEnum,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const customerStatusEnum = pgEnum("customer_status", ["active", "inactive"]);
export const billingStatusEnum = pgEnum("billing_status", ["pending", "partial", "paid", "overdue"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "bank", "easypaisa"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerName: varchar("provider_name", { length: 255 }).notNull(),
  contactNumber: varchar("contact_number", { length: 50 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 120 }).notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  price: integer("price").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, table => ({
  planNamePerStore: uniqueIndex("plans_store_name_unique").on(table.storeId, table.name),
}));

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 120 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  address: text("address"),
  activationDate: date("activation_date").notNull(),
  expirationDate: date("expiration_date").notNull(),
  status: customerStatusEnum("status").notNull().default("active"),
  creditBalance: integer("credit_balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, table => ({
  customerUsernamePerStore: uniqueIndex("customers_store_username_unique").on(table.storeId, table.username),
}));

export const billingPeriods = pgTable("billing_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  amountDue: integer("amount_due").notNull(),
  amountPaid: integer("amount_paid").notNull().default(0),
  balance: integer("balance").notNull(),
  status: billingStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, table => ({
  billingPeriodPerCustomer: unique("billing_periods_customer_start_unique").on(table.customerId, table.periodStart),
}));

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  unappliedAmount: integer("unapplied_amount").notNull().default(0),
  method: paymentMethodEnum("method").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  billingPeriodId: uuid("billing_period_id")
    .notNull()
    .references(() => billingPeriods.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  admin: one(users, {
    fields: [stores.adminId],
    references: [users.id],
  }),
  plans: many(plans),
  customers: many(customers),
  payments: many(payments),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  store: one(stores, {
    fields: [plans.storeId],
    references: [stores.id],
  }),
  customers: many(customers),
  billingPeriods: many(billingPeriods),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, {
    fields: [customers.storeId],
    references: [stores.id],
  }),
  plan: one(plans, {
    fields: [customers.planId],
    references: [plans.id],
  }),
  billingPeriods: many(billingPeriods),
  payments: many(payments),
}));

export const billingPeriodsRelations = relations(billingPeriods, ({ one, many }) => ({
  store: one(stores, {
    fields: [billingPeriods.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [billingPeriods.customerId],
    references: [customers.id],
  }),
  plan: one(plans, {
    fields: [billingPeriods.planId],
    references: [plans.id],
  }),
  allocations: many(paymentAllocations),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  store: one(stores, {
    fields: [payments.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
  billingPeriod: one(billingPeriods, {
    fields: [paymentAllocations.billingPeriodId],
    references: [billingPeriods.id],
  }),
}));
