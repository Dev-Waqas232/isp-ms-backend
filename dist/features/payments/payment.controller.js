"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
const http_1 = require("../../utils/http");
const payment_service_1 = require("./payment.service");
const paymentMethods = ["cash", "bank", "easypaisa"];
function validAmount(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function validMethod(value) {
    return typeof value === "string" && paymentMethods.includes(value);
}
async function resolveStore(req, res) {
    if (!req.user) {
        (0, http_1.sendError)(res, 401, "Authentication token is required");
        return null;
    }
    const store = await (0, payment_service_1.getAdminStore)(req.user.id);
    if (!store) {
        (0, http_1.sendError)(res, 404, "Store is required before managing payments");
        return null;
    }
    return store;
}
async function create(req, res) {
    const store = await resolveStore(req, res);
    if (!store)
        return;
    if (typeof req.body.customerId !== "string")
        return (0, http_1.sendError)(res, 400, "Customer is required");
    if (!validAmount(req.body.amount))
        return (0, http_1.sendError)(res, 400, "Payment amount must be a positive integer");
    if (!validMethod(req.body.method))
        return (0, http_1.sendError)(res, 400, "Payment method is invalid");
    try {
        const payment = await (0, payment_service_1.recordPayment)({
            storeId: store.id,
            customerId: req.body.customerId,
            amount: req.body.amount,
            method: req.body.method,
            paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
            reference: req.body.reference,
            notes: req.body.notes,
        });
        return res.status(201).json({ payment });
    }
    catch (error) {
        if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
            return (0, http_1.sendError)(res, 404, "Customer not found");
        }
        console.error("Record payment failed:", error);
        return (0, http_1.sendError)(res, 500, "Unable to record payment");
    }
}
async function list(req, res) {
    const store = await resolveStore(req, res);
    if (!store)
        return;
    const result = await (0, payment_service_1.listPayments)(store.id, {
        month: typeof req.query.month === "string" ? req.query.month : undefined,
        customerId: typeof req.query.customerId === "string" ? req.query.customerId : undefined,
    });
    return res.status(200).json(result);
}
