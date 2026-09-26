import { beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { resetStore } from "./services/demoStore";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("SANYOG request orchestration", () => {
  beforeEach(() => resetStore());

  it("hard-blocks submission when consent is not true", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.citizen.submit({
      citizenName: "Test Citizen",
      requestType: "Scholarship",
      description: "I need help with a scholarship request.",
      departments: ["MahaDBT"],
      location: { lat: 19.07, lng: 72.87, address: "Mumbai, Maharashtra" },
      attachments: [],
      language: "English",
      consent: false as never,
    })).rejects.toThrow();
  });

  it("returns a tracking ID and partial department outcomes immediately", async () => {
    const caller = appRouter.createCaller(createContext());
    const response = await caller.citizen.submit({
      citizenName: "Test Citizen",
      requestType: "Scholarship",
      description: "I need help with a new scholarship request for college.",
      departments: ["MahaDBT", "Aaple Sarkar"],
      location: { lat: 19.07, lng: 72.87, address: "Mumbai, Maharashtra" },
      attachments: [],
      language: "English",
      consent: true,
      priority: "High",
    });

    expect(response.success).toBe(true);
    if (!response.success) return;
    expect(response.data.trackingId).toMatch(/^SYN-[A-Z0-9]{6}$/);
    expect(response.data.request.statusPerDepartment.map((status) => status.status)).toEqual(["success", "retrying"]);

    const tracked = await caller.citizen.track({ trackingId: response.data.trackingId });
    expect(tracked.success).toBe(true);
    expect(tracked.data?.trackingId).toBe(response.data.trackingId);
  });

  it("routes automatically from the selected service when recipients are omitted", async () => {
    const caller = appRouter.createCaller(createContext());
    const response = await caller.citizen.submit({
      citizenName: "Test Citizen",
      requestType: "Income Certificate",
      description: "I need an income certificate for an education application.",
      attachments: [],
      language: "English",
      consent: true,
    });

    expect(response.success).toBe(true);
    if (!response.success) return;
    expect(response.data.request.departments).toEqual(["Aaple Sarkar"]);
    expect(response.data.request.location.address).toBe("Maharashtra, India");
  });

  it("filters citizen choices through the active routing rule", async () => {
    const caller = appRouter.createCaller(createContext());
    const response = await caller.citizen.submit({
      citizenName: "Test Citizen",
      requestType: "Income Certificate",
      description: "I need an income certificate for an education application.",
      departments: ["Grievance Cell"],
      location: { lat: 19.07, lng: 72.87, address: "Mumbai, Maharashtra" },
      attachments: [],
      language: "English",
      consent: true,
    });
    expect(response.success).toBe(false);
    expect(response.message).toContain("not enabled");
  });
});
