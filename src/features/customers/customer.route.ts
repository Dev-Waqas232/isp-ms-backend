import { RequestHandler, Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { create, deactivate, detail, list, update } from "./customer.controller";

const router = Router();

router.use(requireAuth as unknown as RequestHandler);
router.get("/", list as unknown as RequestHandler);
router.post("/", create as unknown as RequestHandler);
router.get("/:id", detail as unknown as RequestHandler);
router.patch("/:id", update as unknown as RequestHandler);
router.patch("/:id/deactivate", deactivate as unknown as RequestHandler);

export default router;
