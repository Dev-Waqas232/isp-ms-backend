import type { Response } from "express";

import type { AuthRequest } from "../../types/express";
import { sendError } from "../../utils/http";
import { getAdminStore, listPayments, recordPayment, type PaymentMethod } from "./payment.service";

const paymentMethods: PaymentMethod[] = ["cash", "bank", "easypaisa"];

function validAmount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && paymentMethods.includes(value as PaymentMethod);
}

async function resolveStore(req: AuthRequest, res: Response) {
  if (!req.user) {
    sendError(res, 401, "Authentication token is required");
    return null;
  }

  const store = await getAdminStore(req.user.id);

  if (!store) {
    sendError(res, 404, "Store is required before managing payments");
    return null;
  }

  return store;
}

export async function create(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  if (typeof req.body.customerId !== "string") return sendError(res, 400, "Customer is required");
  if (!validAmount(req.body.amount)) return sendError(res, 400, "Payment amount must be a positive integer");
  if (!validMethod(req.body.method)) return sendError(res, 400, "Payment method is invalid");

  try {
    const payment = await recordPayment({
      storeId: store.id,
      customerId: req.body.customerId,
      amount: req.body.amount,
      method: req.body.method,
      paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
      reference: req.body.reference,
      notes: req.body.notes,
    });

    return res.status(201).json({ payment });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return sendError(res, 404, "Customer not found");
    }

    console.error("Record payment failed:", error);
    return sendError(res, 500, "Unable to record payment");
  }
}

export async function list(req: AuthRequest, res: Response) {
  const store = await resolveStore(req, res);
  if (!store) return;

  const result = await listPayments(store.id, {
    month: typeof req.query.month === "string" ? req.query.month : undefined,
    customerId: typeof req.query.customerId === "string" ? req.query.customerId : undefined,
  });

  return res.status(200).json(result);
}
