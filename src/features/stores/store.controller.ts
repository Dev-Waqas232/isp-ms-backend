import type { Request, Response } from "express";

import { createStore, getStoresByAdmin } from "./store.service";
import { sendError } from "../../utils/http";
import { AuthRequest } from "../../types/express";

function requiredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function create(req: AuthRequest, res: Response) {
  if (!req.user) {
    return sendError(res, 401, "Authentication token is required");
  }

  if (!requiredString(req.body.providerName)) {
    return sendError(res, 400, "Provider name is required");
  }

  if (!requiredString(req.body.contactNumber)) {
    return sendError(res, 400, "Contact number is required");
  }

  if (!requiredString(req.body.city)) {
    return sendError(res, 400, "City is required");
  }

  try {
    const logoUrl = req.file
      ? `/uploads/logos/${req.file.filename}`
      : undefined;
    const store = await createStore({
      adminId: req.user.id,
      providerName: req.body.providerName,
      contactNumber: req.body.contactNumber,
      address: req.body.address,
      city: req.body.city,
      description: req.body.description,
      logoUrl,
    });

    return res.status(201).json({ store });
  } catch (error) {
    console.error("Create store failed:", error);
    return sendError(res, 500, "Unable to create store");
  }
}

export async function listMine(req: AuthRequest, res: Response) {
  if (!req.user) {
    return sendError(res, 401, "Authentication token is required");
  }

  const stores = await getStoresByAdmin(req.user.id);

  return res.status(200).json({ stores });
}
