import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db/pool";
import authRoutes from "./routes/authRoutes";
import goalsRoutes from "./routes/goalsRoutes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);

// Basic error handler so unexpected errors don't crash the process silently.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
