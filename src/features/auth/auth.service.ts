import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { db } from "../../db/config";
import { users } from "../../db/schema";
import { env } from "../../utils/env";

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

function createToken(user: { id: string; email: string }) {
  return jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: "1d",
  });
}

function serializeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

export async function registerUser(payload: RegisterPayload) {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser) {
    throw new Error("EMAIL_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const [user] = await db
    .insert(users)
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

export async function loginUser(payload: LoginPayload) {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return {
    token: createToken(user),
    user: serializeUser(user),
  };
}

export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user ? serializeUser(user) : null;
}
