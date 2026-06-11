"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStore = createStore;
exports.getStoresByAdmin = getStoresByAdmin;
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../../db/config");
const schema_1 = require("../../db/schema");
async function createStore(payload) {
    const [store] = await config_1.db.insert(schema_1.stores).values({
        adminId: payload.adminId,
        providerName: payload.providerName.trim(),
        contactNumber: payload.contactNumber.trim(),
        address: payload.address?.trim() || null,
        city: payload.city.trim(),
        description: payload.description?.trim() || null,
        logoUrl: payload.logoUrl ?? null,
    }).returning();
    return store;
}
async function getStoresByAdmin(adminId) {
    return config_1.db.query.stores.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.stores.adminId, adminId),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
}
