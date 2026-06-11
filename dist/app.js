"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const auth_route_1 = __importDefault(require("./features/auth/auth.route"));
const store_route_1 = __importDefault(require("./features/stores/store.route"));
const env_1 = require("./utils/env");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: env_1.env.clientUrl }));
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
app.get("/health", (_req, res) => {
    res.status(200).json({ message: "Server is healthy" });
});
app.use("/api/auth", auth_route_1.default);
app.use("/api/stores", store_route_1.default);
app.listen(env_1.env.port, () => {
    console.log(`Server is running on port ${env_1.env.port}`);
});
