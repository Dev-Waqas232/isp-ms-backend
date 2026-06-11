"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storesRelations = exports.usersRelations = exports.stores = exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
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
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    stores: many(exports.stores),
}));
exports.storesRelations = (0, drizzle_orm_1.relations)(exports.stores, ({ one }) => ({
    admin: one(exports.users, {
        fields: [exports.stores.adminId],
        references: [exports.users.id],
    }),
}));
