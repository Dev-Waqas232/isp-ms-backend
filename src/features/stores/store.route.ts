import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { RequestHandler } from "express";
import { Router } from "express";
import multer from "multer";

import { create, listMine } from "./store.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const logoUploadPath = "uploads/logos";
fs.mkdirSync(logoUploadPath, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: logoUploadPath,
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${extension}`);
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

const router = Router();
const uploadLogo: RequestHandler = (req, res, next) => {
  upload.single("logo")(req, res, error => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Logo must be smaller than 2MB" });
      return;
    }

    res.status(400).json({ message: error.message ?? "Unable to upload logo" });
  });
};

router.use(requireAuth as unknown as RequestHandler);
router.get("/", listMine as unknown as RequestHandler);
router.post("/", uploadLogo, create as unknown as RequestHandler);

export default router;
