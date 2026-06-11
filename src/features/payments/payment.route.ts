import { RequestHandler, Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { create, list } from "./payment.controller";

const router = Router();

router.use(requireAuth as unknown as RequestHandler);
router.get("/", list as unknown as RequestHandler);
router.post("/", create as unknown as RequestHandler);

export default router;
