import type { Response } from "express";

import type { AuthRequest } from "../../types/express";
import { sendError } from "../../utils/http";
import { createPlan, deactivatePlan, getAdminStore, getPlanById, listPlans, updatePlan } from "./plan.service";

function requiredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function validPrice(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveStore(req: AuthRequest, res: Response) {
  if (!req.user) {
    sendError(res, 401, "Authentication token is required");
    return null;
  }

  const store = await getAdminStore(req.user.id);

  if (!store) {
    sendError(res, 404, "Store is required before managing plans");
    return null;
  }

  return store;
}

export async function list(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  const activeOnly = req.query.activeOnly !== "false";
  const plans = await listPlans(store.id, activeOnly);
  return res.status(200).json({ plans });
}

export async function create(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  if (!requiredString(req.body.name)) {
    return sendError(res, 400, "Plan name is required");
  }

  if (!validPrice(req.body.price)) {
    return sendError(res, 400, "Plan price must be a positive integer");
  }

  try {
    const plan = await createPlan({
      storeId: store.id,
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
    });

    return res.status(201).json({ plan });
  } catch (error) {
    console.error("Create plan failed:", error);
    return sendError(res, 500, "Unable to create plan");
  }
}

export async function update(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;
  const planId = getParam(req.params.id);

  if (!planId) {
    return sendError(res, 400, "Plan id is required");
  }

  const existingPlan = await getPlanById(store.id, planId);
  if (!existingPlan) {
    return sendError(res, 404, "Plan not found");
  }

  if (req.body.name !== undefined && !requiredString(req.body.name)) {
    return sendError(res, 400, "Plan name is required");
  }

  if (req.body.price !== undefined && !validPrice(req.body.price)) {
    return sendError(res, 400, "Plan price must be a positive integer");
  }

  const plan = await updatePlan(store.id, planId, {
    name: req.body.name,
    price: req.body.price,
    description: req.body.description,
    isActive: req.body.isActive,
  });

  return res.status(200).json({ plan });
}

export async function remove(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;
  const planId = getParam(req.params.id);

  if (!planId) {
    return sendError(res, 400, "Plan id is required");
  }

  const plan = await deactivatePlan(store.id, planId);

  if (!plan) {
    return sendError(res, 404, "Plan not found");
  }

  return res.status(200).json({ plan });
}
