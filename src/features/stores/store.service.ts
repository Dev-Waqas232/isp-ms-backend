import { eq } from "drizzle-orm";

import { db } from "../../db/config";
import { stores } from "../../db/schema";

export type CreateStorePayload = {
  adminId: string;
  providerName: string;
  contactNumber: string;
  address?: string;
  city: string;
  description?: string;
  logoUrl?: string;
};

export async function createStore(payload: CreateStorePayload) {
  const [store] = await db.insert(stores).values({
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

export async function getStoresByAdmin(adminId: string) {
  return db.query.stores.findMany({
    where: eq(stores.adminId, adminId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}
