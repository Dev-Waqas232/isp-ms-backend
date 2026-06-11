import type { Response } from "express";

import type { AuthRequest } from "../../types/express";
import { sendError } from "../../utils/http";
import { createCustomer, getAdminStore, getCustomerById, listCustomers, updateCustomer } from "./customer.service";

function requiredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
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
    sendError(res, 404, "Store is required before managing customers");
    return null;
  }

  return store;
}

export async function list(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
  const status = req.query.status === "inactive" || req.query.status === "all" ? req.query.status : "active";
  const result = await listCustomers(store.id, {
    page,
    limit,
    status,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  });

  return res.status(200).json(result);
}

export async function create(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  if (!requiredString(req.body.name)) return sendError(res, 400, "Customer name is required");
  if (!requiredString(req.body.username)) return sendError(res, 400, "Username is required");
  if (!requiredString(req.body.phoneNumber)) return sendError(res, 400, "Phone number is required");
  if (!requiredString(req.body.planId)) return sendError(res, 400, "Plan is required");
  if (!validDate(req.body.activationDate)) return sendError(res, 400, "Activation date must be YYYY-MM-DD");

  try {
    const customer = await createCustomer({
      storeId: store.id,
      planId: req.body.planId,
      name: req.body.name,
      username: req.body.username,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      activationDate: req.body.activationDate,
    });

    return res.status(201).json({ customer });
  } catch (error) {
    if (error instanceof Error && error.message === "PLAN_NOT_FOUND") {
      return sendError(res, 404, "Plan not found");
    }

    console.error("Create customer failed:", error);
    return sendError(res, 500, "Unable to create customer");
  }
}

export async function detail(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  const customerId = getParam(req.params.id);
  if (!customerId) {
    return sendError(res, 400, "Customer id is required");
  }

  const customer = await getCustomerById(store.id, customerId);

  if (!customer) {
    return sendError(res, 404, "Customer not found");
  }

  return res.status(200).json({ customer });
}

export async function update(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;
  const customerId = getParam(req.params.id);

  if (!customerId) {
    return sendError(res, 400, "Customer id is required");
  }

  if (req.body.name !== undefined && !requiredString(req.body.name)) return sendError(res, 400, "Customer name is required");
  if (req.body.username !== undefined && !requiredString(req.body.username)) return sendError(res, 400, "Username is required");
  if (req.body.phoneNumber !== undefined && !requiredString(req.body.phoneNumber)) return sendError(res, 400, "Phone number is required");
  if (req.body.activationDate !== undefined && !validDate(req.body.activationDate)) return sendError(res, 400, "Activation date must be YYYY-MM-DD");
  if (req.body.status !== undefined && req.body.status !== "active" && req.body.status !== "inactive") return sendError(res, 400, "Customer status is invalid");

  const customer = await updateCustomer(store.id, customerId, {
    planId: req.body.planId,
    name: req.body.name,
    username: req.body.username,
    phoneNumber: req.body.phoneNumber,
    address: req.body.address,
    activationDate: req.body.activationDate,
    status: req.body.status,
  });

  if (!customer) {
    return sendError(res, 404, "Customer not found");
  }

  return res.status(200).json({ customer });
}

export async function deactivate(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;
  const customerId = getParam(req.params.id);

  if (!customerId) {
    return sendError(res, 400, "Customer id is required");
  }

  const customer = await updateCustomer(store.id, customerId, { status: "inactive" });

  if (!customer) {
    return sendError(res, 404, "Customer not found");
  }

  return res.status(200).json({ customer });
}
