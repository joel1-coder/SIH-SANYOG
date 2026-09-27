import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const trpcHandler = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error, path }) {
    console.error(`[tRPC Error] path='${path}':`, error.message);
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "SANYOG API" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "SANYOG API" });
});

// Mount on all possible route prefixes that Vercel or clients might request
app.use("/api/trpc", trpcHandler);
app.use("/trpc", trpcHandler);
app.use("/", (req, res, next) => {
  // If the request path is a tRPC call directly (e.g. /auth.demoLogin)
  if (req.path.includes(".")) {
    return trpcHandler(req, res, next);
  }
  next();
});

// Catch-all JSON error handler so Vercel never returns HTML 500
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Vercel API Error]:", err);
  res.status(500).json({ error: "Internal Server Error", message: String(err?.message ?? err) });
});

export default app;
