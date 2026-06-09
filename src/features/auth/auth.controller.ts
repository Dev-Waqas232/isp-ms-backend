import type { Request, Response } from "express";

import { getUserById, loginUser, registerUser } from "./auth.service";
import { sendError } from "../../utils/http";
import { AuthRequest } from "../../types/express";

export async function register(req: Request, res: Response) {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return sendError(res, 409, "Email is already registered");
    }

    return sendError(res, 500, "Unable to create account");
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return sendError(res, 401, "Invalid email or password");
    }

    return sendError(res, 500, "Unable to sign in");
  }
}

export async function validate(req: AuthRequest, res: Response) {
  if (!req?.user) {
    return sendError(res, 401, "Authentication token is required");
  }

  const user = await getUserById(req?.user.id);

  if (!user) {
    return sendError(res, 401, "User no longer exists");
  }

  return res.status(200).json({ user });
}
