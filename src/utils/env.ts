export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
};
