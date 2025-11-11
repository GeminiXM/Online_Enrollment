"use strict";

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import onlineBuyRoutes from "./routes/onlineBuyRoutes.js";
import logger from "./utils/logger.js";

// Load env – local or fallback to Online_Enrollment backend .env
(() => {
  try {
    const localEnv = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(localEnv)) {
      dotenv.config({ path: localEnv });
      return;
    }
    const fallbackEnv = path.resolve(
      process.cwd(),
      "..",
      "..",
      "backend",
      ".env"
    );
    if (fs.existsSync(fallbackEnv)) {
      dotenv.config({ path: fallbackEnv });
    } else {
      dotenv.config();
    }
  } catch {
    dotenv.config();
  }
})();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "online_purchase_backend" });
});

app.use("/api/online-buy", onlineBuyRoutes);

const PORT = process.env.ONLINE_BUY_BACKEND_PORT || 4070;
app.listen(PORT, () => {
  logger.info(`Online_Purchase backend listening on port ${PORT}`);
});
