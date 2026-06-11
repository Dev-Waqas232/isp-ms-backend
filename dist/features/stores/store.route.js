"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const store_controller_1 = require("./store.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const logoUploadPath = "uploads/logos";
fs_1.default.mkdirSync(logoUploadPath, { recursive: true });
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: logoUploadPath,
        filename: (_req, file, cb) => {
            const extension = path_1.default.extname(file.originalname);
            cb(null, `${crypto_1.default.randomUUID()}${extension}`);
        },
    }),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Only image uploads are allowed"));
            return;
        }
        cb(null, true);
    },
});
const router = (0, express_1.Router)();
const uploadLogo = (req, res, next) => {
    upload.single("logo")(req, res, error => {
        if (!error) {
            next();
            return;
        }
        if (error instanceof multer_1.default.MulterError && error.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({ message: "Logo must be smaller than 2MB" });
            return;
        }
        res.status(400).json({ message: error.message ?? "Unable to upload logo" });
    });
};
router.use(auth_middleware_1.requireAuth);
router.get("/", store_controller_1.listMine);
router.post("/", uploadLogo, store_controller_1.create);
exports.default = router;
