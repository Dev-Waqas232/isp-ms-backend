import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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

export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one }) => ({
  admin: one(users, {
    fields: [stores.adminId],
    references: [users.id],
  }),
}));
