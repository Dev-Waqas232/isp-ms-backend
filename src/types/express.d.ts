import { Request } from "express";
import type { AuthUser } from "./auth";

export interface AuthRequest extends Request {
  user: AuthUser;
}
