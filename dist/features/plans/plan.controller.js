"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.update = update;
exports.remove = remove;
const http_1 = require("../../utils/http");
const plan_service_1 = require("./plan.service");
function requiredString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function validPrice(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function getParam(value) {
    return Array.isArray(value) ? value[0] : value;
}
async function resolveStore(req, res) {
    if (!req.user) {
        (0, http_1.sendError)(res, 401, "Authentication token is required");
        return null;
    }
    const store = await (0, plan_service_1.getAdminStore)(req.user.id);
    if (!store) {
        (0, http_1.sendError)(res, 404, "Store is required before managing plans");
        return null;
    }
    return store;
}
async function list(req, res) {
    const store = await resolveStore(req, res);
    if (!store)
        return;
    const activeOnly = req.query.activeOnly !== "false";
    const plans = await (0, plan_service_1.listPlans)(store.id, activeOnly);
    return res.status(200).json({ plans });
}
async function create(req, res) {
    const store = await resolveStore(req, res);
    if (!store)
        return;
    if (!requiredString(req.body.name)) {
        return (0, http_1.sendError)(res, 400, "Plan name is required");
    }
    if (!validPrice(req.body.price)) {
        return (0, http_1.sendError)(res, 400, "Plan price must be a positive integer");
    }
    try {
        const plan = await (0, plan_service_1.createPlan)({
            storeId: store.id,
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
        });
        return res.status(201).json({ plan });
    }
    catch (error) {
        console.error("Create plan failed:", error);
        return (0, http_1.sendError)(res, 500, "Unable to create plan");
    }
}
async function update(req, res) {
    const store = await resolveStore(req, res);
    if (!store)
        return;
    const planId = getParam(req.params.id);
    if (!planId) {
        return (0, http_1.sendError)(res, 400, "Plan id is required");
    }
    const existingPlan = await (0, plan_service_1.getPlanById)(store.id, planId);
    if (!existingPlan) {
        return (0, http_1.sendError)(res, 404, "Plan not found");
    }
    if (req.body.name !== undefined && !requiredString(req.body.name)) {
        return (0, http_1.sendError)(res, 400, "Plan name is required");
    }
    if (req.body.price !== undefined && !validPrice(req.body.price)) {
        return (0, http_1.sendError)(res, 400, "Plan price must be a positive integer");
    }
    const plan = await (0, plan_service_1.updatePlan)(store.id, planId, {
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        isActive: req.body.isActive,
    });
    return res.status(200).json({ plan });
}
async function remove(req, res) {
    const store = await resolveStore(req, res);
    if (!store)
        return;
    const planId = getParam(req.params.id);
    if (!planId) {
        return (0, http_1.sendError)(res, 400, "Plan id is required");
    }
    const plan = await (0, plan_service_1.deactivatePlan)(store.id, planId);
    if (!plan) {
        return (0, http_1.sendError)(res, 404, "Plan not found");
    }
    return res.status(200).json({ plan });
}
