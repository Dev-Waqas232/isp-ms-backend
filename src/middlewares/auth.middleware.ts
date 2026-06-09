import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import type { AuthUser } from "../types/auth";
import { env } from "../utils/env";
import { sendError } from "../utils/http";
import { AuthRequest } from "../types/express";

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return sendError(res, 401, "Authentication token is required");
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    next();
  } catch {
    return sendError(res, 401, "Authentication token is invalid or expired");
  }
}
