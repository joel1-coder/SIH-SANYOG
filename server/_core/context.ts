import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: null;
};

/**
 * Context factory for tRPC.
 *
 * This app runs in demo mode — authentication is handled via the
 * "sanyog-role" cookie read in each router procedure, not via a DB
 * user record.  We skip the OAuth SDK to avoid pulling in
 * drizzle-orm/mysql2 native binaries that crash Vercel serverless cold
 * starts when DATABASE_URL is absent.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
