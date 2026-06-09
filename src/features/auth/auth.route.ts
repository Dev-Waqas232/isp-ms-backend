import { RequestHandler, Router } from "express";

import { login, register, validate } from "./auth.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get(
  "/validate",
  requireAuth as unknown as RequestHandler,
  validate as unknown as RequestHandler,
);

export default router;
