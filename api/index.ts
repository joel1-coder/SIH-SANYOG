import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

const trpcHandler = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error, path }) {
    console.error(`[tRPC API Error] path '${path}':`, error);
  },
});

// Handle both standard Express path (/api/trpc) and Vercel rewritten path (/trpc)
app.use("/api/trpc", trpcHandler);
app.use("/trpc", trpcHandler);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "SANYOG API" });
});

// Global JSON error handler preventing HTML 500 responses
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Vercel API Server Error]:", err);
  res.status(500).json({ error: "Internal Server Error", message: err?.message || String(err) });
});

export default app;
