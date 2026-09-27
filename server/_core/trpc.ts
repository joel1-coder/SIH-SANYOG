import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// In demo mode, all procedures are public — auth is handled via the
// "sanyog-role" cookie read in sessionRole() in each router.
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure;
export const adminProcedure = t.procedure;
