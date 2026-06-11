"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getUserById = getUserById;
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../db/config");
const schema_1 = require("../../db/schema");
const env_1 = require("../../utils/env");
function createToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, env_1.env.jwtSecret, {
        expiresIn: "1d",
    });
}
function serializeUser(user) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
    };
}
async function registerUser(payload) {
    const normalizedEmail = payload.email.toLowerCase().trim();
    const existingUser = await config_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, normalizedEmail),
    });
    if (existingUser) {
        throw new Error("EMAIL_EXISTS");
    }
    const hashedPassword = await bcrypt_1.default.hash(payload.password, 12);
    const [user] = await config_1.db
        .insert(schema_1.users)
        .values({
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
    })
        .returning();
    return {
        token: createToken(user),
        user: serializeUser(user),
    };
}
async function loginUser(payload) {
    const normalizedEmail = payload.email.toLowerCase().trim();
    const user = await config_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, normalizedEmail),
    });
    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }
    const passwordMatches = await bcrypt_1.default.compare(payload.password, user.password);
    if (!passwordMatches) {
        throw new Error("INVALID_CREDENTIALS");
    }
    return {
        token: createToken(user),
        user: serializeUser(user),
    };
}
async function getUserById(userId) {
    const user = await config_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
    });
    return user ? serializeUser(user) : null;
}
