"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.validate = validate;
const auth_service_1 = require("./auth.service");
const http_1 = require("../../utils/http");
async function register(req, res) {
    try {
        const result = await (0, auth_service_1.registerUser)(req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof Error && error.message === "EMAIL_EXISTS") {
            return (0, http_1.sendError)(res, 409, "Email is already registered");
        }
        return (0, http_1.sendError)(res, 500, "Unable to create account");
    }
}
async function login(req, res) {
    try {
        const result = await (0, auth_service_1.loginUser)(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
            return (0, http_1.sendError)(res, 401, "Invalid email or password");
        }
        return (0, http_1.sendError)(res, 500, "Unable to sign in");
    }
}
async function validate(req, res) {
    if (!req?.user) {
        return (0, http_1.sendError)(res, 401, "Authentication token is required");
    }
    const user = await (0, auth_service_1.getUserById)(req?.user.id);
    if (!user) {
        return (0, http_1.sendError)(res, 401, "User no longer exists");
    }
    return res.status(200).json({ user });
}
