import "dotenv/config";

import cors from "cors";
import express from "express";
import path from "path";

import authRoutes from "./features/auth/auth.route";
import storeRoutes from "./features/stores/store.route";
import { env } from "./utils/env";

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);

app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});
