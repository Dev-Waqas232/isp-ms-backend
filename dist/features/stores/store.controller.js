"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.listMine = listMine;
const store_service_1 = require("./store.service");
const http_1 = require("../../utils/http");
function requiredString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
async function create(req, res) {
    if (!req.user) {
        return (0, http_1.sendError)(res, 401, "Authentication token is required");
    }
    if (!requiredString(req.body.providerName)) {
        return (0, http_1.sendError)(res, 400, "Provider name is required");
    }
    if (!requiredString(req.body.contactNumber)) {
        return (0, http_1.sendError)(res, 400, "Contact number is required");
    }
    if (!requiredString(req.body.city)) {
        return (0, http_1.sendError)(res, 400, "City is required");
    }
    try {
        const logoUrl = req.file
            ? `/uploads/logos/${req.file.filename}`
            : undefined;
        const store = await (0, store_service_1.createStore)({
            adminId: req.user.id,
            providerName: req.body.providerName,
            contactNumber: req.body.contactNumber,
            address: req.body.address,
            city: req.body.city,
            description: req.body.description,
            logoUrl,
        });
        return res.status(201).json({ store });
    }
    catch (error) {
        console.error("Create store failed:", error);
        return (0, http_1.sendError)(res, 500, "Unable to create store");
    }
}
async function listMine(req, res) {
    if (!req.user) {
        return (0, http_1.sendError)(res, 401, "Authentication token is required");
    }
    const stores = await (0, store_service_1.getStoresByAdmin)(req.user.id);
    return res.status(200).json({ stores });
}
