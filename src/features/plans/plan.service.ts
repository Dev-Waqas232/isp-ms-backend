import { and, eq } from "drizzle-orm";

import { db } from "../../db/config";
import { plans, stores } from "../../db/schema";

export type CreatePlanPayload = {
  storeId: string;
  name: string;
  price: number;
  description?: string;
};

export type UpdatePlanPayload = {
  name?: string;
  price?: number;
  description?: string | null;
  isActive?: boolean;
};

export async function getAdminStore(adminId: string) {
  return db.query.stores.findFirst({
    where: eq(stores.adminId, adminId),
  });
}

export function listPlans(storeId: string, activeOnly = true) {
  return db.query.plans.findMany({
    where: activeOnly ? and(eq(plans.storeId, storeId), eq(plans.isActive, true)) : eq(plans.storeId, storeId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export async function createPlan(payload: CreatePlanPayload) {
  const [plan] = await db.insert(plans).values({
    storeId: payload.storeId,
    name: payload.name.trim(),
    price: payload.price,
    description: payload.description?.trim() || null,
  }).returning();

  return plan;
}

export async function getPlanById(storeId: string, planId: string) {
  return db.query.plans.findFirst({
    where: and(eq(plans.storeId, storeId), eq(plans.id, planId)),
  });
}

export async function updatePlan(storeId: string, planId: string, payload: UpdatePlanPayload) {
  const [plan] = await db.update(plans)
    .set({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.price !== undefined ? { price: payload.price } : {}),
      ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(plans.storeId, storeId), eq(plans.id, planId)))
    .returning();

  return plan;
}

export function deactivatePlan(storeId: string, planId: string) {
  return updatePlan(storeId, planId, { isActive: false });
}
