"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = sendError;
function sendError(res, status, message) {
    return res.status(status).json({ message });
}
