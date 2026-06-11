"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStore = getAdminStore;
exports.listPlans = listPlans;
exports.createPlan = createPlan;
exports.getPlanById = getPlanById;
exports.updatePlan = updatePlan;
exports.deactivatePlan = deactivatePlan;
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../../db/config");
const schema_1 = require("../../db/schema");
async function getAdminStore(adminId) {
    return config_1.db.query.stores.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.stores.adminId, adminId),
    });
}
function listPlans(storeId, activeOnly = true) {
    return config_1.db.query.plans.findMany({
        where: activeOnly ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.plans.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.plans.isActive, true)) : (0, drizzle_orm_1.eq)(schema_1.plans.storeId, storeId),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
}
async function createPlan(payload) {
    const [plan] = await config_1.db.insert(schema_1.plans).values({
        storeId: payload.storeId,
        name: payload.name.trim(),
        price: payload.price,
        description: payload.description?.trim() || null,
    }).returning();
    return plan;
}
async function getPlanById(storeId, planId) {
    return config_1.db.query.plans.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.plans.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.plans.id, planId)),
    });
}
async function updatePlan(storeId, planId, payload) {
    const [plan] = await config_1.db.update(schema_1.plans)
        .set({
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.price !== undefined ? { price: payload.price } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.plans.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.plans.id, planId)))
        .returning();
    return plan;
}
function deactivatePlan(storeId, planId) {
    return updatePlan(storeId, planId, { isActive: false });
}
