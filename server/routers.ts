import { customAlphabet, nanoid } from "nanoid";
import { parse } from "cookie";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { publicProcedure, router } from "./_core/trpc";
import type { DashboardActionInput, Priority, SanyogRequest, UserRole } from "@shared/types";
import { store, appendAudit, getRequest, updateConnector, getDepartment } from "./services/demoStore";
import { normalizeCitizenMasterId } from "./services/citizenIdentityService";
import { isPotentialDuplicate } from "./services/deduplicationService";
import { findSemanticDuplicates, clusterReports } from "./services/nlpClusteringService";
import { getAllowedDepartments, resolveDepartments } from "./services/routingService";
import { dispatchToConnectors } from "./services/connectorService";

const roleSchema = z.enum(["citizen", "official", "admin"]);
const prioritySchema = z.enum(["Low", "Medium", "High"]);
const locationSchema = z.object({ lat: z.number(), lng: z.number(), address: z.string().min(3) });
const submitSchema = z.object({
  citizenName: z.string().min(2),
  citizenMasterId: z.string().optional(),
  requestType: z.string().min(2),
  description: z.string().min(12),
  departments: z.array(z.string()).optional(),
  location: locationSchema.optional(),
  attachments: z.array(z.string()).default([]),
  language: z.string().default("English"),
  consent: z.literal(true),
  priority: prioritySchema.default("Medium"),
});

function demoUser(role: UserRole) {
  return store.users.find((user) => user.role === role) ?? null;
}

function sessionRole(req: { headers: { cookie?: string } }): UserRole {
  const role = (parse(req.headers.cookie ?? "")["sanyog-role"] ?? "") as string;
  return typeof role === "string" && roleSchema.safeParse(role).success ? (role as UserRole) : "citizen";
}

function withResponse<T>(message: string, data: T) {
  return { success: true as const, message, data };
}

function overallStatus(statuses: SanyogRequest["statusPerDepartment"]): SanyogRequest["overallStatus"] {
  if (statuses.every((status) => status.status === "success")) return "completed";
  if (statuses.some((status) => status.status === "failed")) return "manual-review";
  if (statuses.some((status) => status.status === "retrying")) return "partial";
  return "in-progress";
}

const trackingSuffix = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
function shortTrackingId() {
  return `SYN-${trackingSuffix()}`;
}

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => withResponse("SANYOG services are operational", { status: "ok", timestamp: new Date().toISOString() })),
  }),
  auth: router({
    me: publicProcedure.query(({ ctx }) => demoUser(sessionRole(ctx.req))),
    demoLogin: publicProcedure.input(z.object({ role: roleSchema })).mutation(({ input, ctx }) => {
      try {
        const options = getSessionCookieOptions(ctx.req);
        if (ctx.res && typeof ctx.res.cookie === "function") {
          ctx.res.cookie("sanyog-role", input.role, { ...options, maxAge: 8 * 60 * 60 * 1000 });
        }
      } catch (err) {
        console.warn("[demoLogin] Cookie set warning:", err);
      }
      appendAudit("SESSION_LOGIN", demoUser(input.role)?.name ?? "SANYOG User", `Demo session started as ${input.role}`);
      return withResponse(`Signed in as ${input.role}`, demoUser(input.role));
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      try {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        if (ctx.res && typeof ctx.res.clearCookie === "function") {
          ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
          ctx.res.clearCookie("sanyog-role", { ...cookieOptions, maxAge: -1 });
        }
      } catch (err) {
        console.warn("[logout] Cookie clear warning:", err);
      }
      return { success: true as const };
    }),
  }),
  catalog: router({
    bootstrap: publicProcedure.query(() => withResponse("SANYOG catalog loaded", { departments: store.departments, routingRules: store.routingRules, users: store.users })),
  }),
  citizen: router({
    submit: publicProcedure.input(submitSchema).mutation(async ({ input }) => {
      const departments = input.departments?.length ? resolveDepartments(input.requestType, input.departments) : getAllowedDepartments(input.requestType);
      if (departments.length === 0) {
        return { success: false as const, message: "The selected departments are not enabled for this request type.", data: null };
      }
      const trackingId = shortTrackingId();
      const semanticResult = findSemanticDuplicates(input.description, input.requestType);
      const duplicateFlag = semanticResult.isDuplicate || isPotentialDuplicate(input.description, input.requestType);
      const normalized: SanyogRequest = {
        id: `req-${nanoid(10)}`,
        trackingId,
        citizenMasterId: normalizeCitizenMasterId(input.citizenMasterId, `${input.citizenName}|${input.requestType}`),
        citizenName: input.citizenName,
        requestType: input.requestType,
        description: input.description,
        location: input.location ?? { lat: 0, lng: 0, address: "Maharashtra, India" },
        attachments: input.attachments,
        departments,
        timestamp: new Date().toISOString(),
        priority: input.priority as Priority,
        duplicateFlag,
        statusPerDepartment: departments.map((department) => ({ department, status: "pending", retryCount: 0, lastUpdated: new Date().toISOString() })),
        overallStatus: "in-progress",
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      normalized.statusPerDepartment = await dispatchToConnectors(normalized);
      normalized.overallStatus = overallStatus(normalized.statusPerDepartment);
      store.requests.unshift(normalized);
      appendAudit("REQUEST_SUBMITTED", normalized.citizenName, `${trackingId} routed to ${departments.length} departments; consent=${input.consent}; language=${input.language}`);
      return withResponse("Request submitted across connected departments", {
        trackingId,
        request: normalized,
        duplicateFlag,
        semanticSimilarity: semanticResult.similarity,
        similarToTrackingId: semanticResult.matchingRequest?.trackingId,
      });
    }),
    semanticCheck: publicProcedure
      .input(z.object({ description: z.string().min(5), requestType: z.string().min(2) }))
      .query(({ input }) => {
        const result = findSemanticDuplicates(input.description, input.requestType);
        return withResponse("Semantic duplicate check complete", result);
      }),
    track: publicProcedure.input(z.object({ trackingId: z.string().min(3) })).query(({ input }) => {
      const request = getRequest(input.trackingId);
      if (!request) return { success: false as const, message: "No request found for this tracking ID.", data: null };
      return withResponse("Tracking record found", request);
    }),
    myRequests: publicProcedure.input(z.object({ citizenName: z.string().optional() }).optional()).query(({ input }) => {
      const name = input?.citizenName;
      return withResponse("Citizen requests loaded", store.requests.filter((request) => !name || request.citizenName === name));
    }),
    aiAssist: publicProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(({ input }) => {
        const msg = input.message.toLowerCase();

        // Certificate knowledge base
        const kb: Record<string, { title: string; description: string; documents: string[]; departments: string[]; time: string; tip: string }> = {
          income: {
            title: "Income Certificate",
            description: "Certifies your annual family income. Required for scholarships, government schemes, fee waivers, and subsidies.",
            documents: ["Aadhaar card (self + family)", "Ration card", "Salary slip or income proof (last 3 months)", "Bank passbook (last 6 months)", "Latest electricity/gas bill", "Passport-size photo (2 copies)"],
            departments: ["MahaDBT", "Revenue Department"],
            time: "7–10 working days",
            tip: "Submit during first week of month for faster processing. Family income should be below ₹8 lakh/year for most schemes.",
          },
          community: {
            title: "Community / Caste Certificate",
            description: "Proves your caste or community (OBC/SC/ST/NT). Required for reservations, scholarships, and government job applications.",
            documents: ["Aadhaar card", "School leaving certificate", "Father's caste certificate (if available)", "Ration card", "Birth certificate", "Revenue/Village record (7/12 extract)", "Self-declaration affidavit (₹100 stamp paper)"],
            departments: ["Revenue Department", "Social Justice Department"],
            time: "15–20 working days",
            tip: "Carry original + 2 photocopies of every document. Visit your Tehsildar office with a gazette officer attestation.",
          },
          aadhaar: {
            title: "Aadhaar Card / Correction",
            description: "India's universal ID. Required for almost all government services, banking, and benefits.",
            documents: ["Proof of Identity (PAN/Voter ID/Passport)", "Proof of Address (utility bill/bank statement)", "Proof of Date of Birth (birth certificate/school certificate)", "Existing Aadhaar (for correction)", "Mobile number linked to Aadhaar"],
            departments: ["UIDAI / Aaple Sarkar"],
            time: "New: 90 days | Update: 30 days",
            tip: "Book an appointment at uidai.gov.in/enrolment before visiting. Update requests can be done online at myaadhaar.uidai.gov.in.",
          },
          scholarship: {
            title: "Scholarship Application",
            description: "Financial aid for students based on merit or economic background. Covers tuition, hostel, and exam fees.",
            documents: ["Aadhaar card", "Income certificate (below ₹8 lakh)", "Caste certificate (for category scholarships)", "Marksheet/Grade card (previous year)", "Bonafide certificate from school/college", "Bank account details (student's own account)", "Fee receipt from institution", "Passport-size photo"],
            departments: ["MahaDBT", "Social Justice Department", "Minority Development"],
            time: "Processing after academic year start (June–Sept window)",
            tip: "Apply on mahadbt.maharashtra.gov.in. Income + caste certificate must be less than 1 year old at time of application.",
          },
          domicile: {
            title: "Domicile / Residence Certificate",
            description: "Proves continuous residence in Maharashtra. Required for state-level job reservations and college admissions.",
            documents: ["Aadhaar card", "Ration card showing Maharashtra address", "School certificates from Maharashtra (7th to 12th)", "Utility bills (3+ years old)", "Voter ID (Maharashtra)", "Passport (if available)"],
            departments: ["Revenue Department", "Aaple Sarkar"],
            time: "10–15 working days",
            tip: "You or your parents must have resided in Maharashtra for at least 15 years. Bring school records as proof.",
          },
          birth: {
            title: "Birth Certificate",
            description: "Official proof of date and place of birth. Needed for school admissions, passport, and legal documents.",
            documents: ["Hospital discharge summary", "Parent's Aadhaar cards", "Parent's marriage certificate", "Application form from Municipal Corporation / Gram Panchayat"],
            departments: ["Municipal Corporation / Gram Panchayat", "Aaple Sarkar"],
            time: "7 days (within 21 days of birth) | Late: 30–45 days",
            tip: "Register within 21 days of birth to avoid late fees and affidavit requirements. Visit your nearest Municipal Corporation.",
          },
          pan: {
            title: "PAN Card",
            description: "Permanent Account Number — required for income tax filing, banking, and financial transactions above ₹50,000.",
            documents: ["Aadhaar card (for e-KYC)", "Proof of identity", "Proof of date of birth", "Passport-size photo"],
            departments: ["Income Tax Department (NSDL/UTIITSL)"],
            time: "15–20 working days (physical) | Instant e-PAN",
            tip: "Apply online at onlineservices.nsdl.com or get instant e-PAN using Aadhaar at incometax.gov.in. Completely free for e-PAN.",
          },
        };

        // Smart keyword matching
        const matches = Object.entries(kb).filter(([key]) => msg.includes(key));

        // Also check common synonyms
        if (!matches.length) {
          if (msg.includes("obc") || msg.includes("sc") || msg.includes("st") || msg.includes("caste") || msg.includes("category")) matches.push(["community", kb.community]);
          if (msg.includes("aadhar") || msg.includes("uid") || msg.includes("biometric")) matches.push(["aadhaar", kb.aadhaar]);
          if (msg.includes("study") || msg.includes("student") || msg.includes("education") || msg.includes("college") || msg.includes("fee waiver")) matches.push(["scholarship", kb.scholarship]);
          if (msg.includes("salary") || msg.includes("annual") || msg.includes("earning") || msg.includes("below poverty")) matches.push(["income", kb.income]);
          if (msg.includes("residence") || msg.includes("resident") || msg.includes("address proof") || msg.includes("maharashtra")) matches.push(["domicile", kb.domicile]);
          if (msg.includes("born") || msg.includes("hospital") || msg.includes("newborn") || msg.includes("registration")) matches.push(["birth", kb.birth]);
          if (msg.includes("tax") || msg.includes("account number") || msg.includes("banking")) matches.push(["pan", kb.pan]);
        }

        if (matches.length > 0) {
          const [, cert] = matches[0];
          return withResponse("ai_cert", {
            type: "certificate",
            cert,
          });
        }

        // Generic greeting / fallback
        if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("namaste")) {
          return withResponse("ai_greeting", {
            type: "greeting",
            message: "Namaste! 🙏 I'm your SANYOG AI Assistant. I can help you understand what documents you need for government certificates. Try asking:\n\n• \"I need an Income Certificate\"\n• \"How to apply for a Community Certificate?\"\n• \"What documents for Scholarship?\"\n• \"Help me with Aadhaar correction\"",
          });
        }

        if (msg.includes("help") || msg.includes("what can") || msg.includes("list")) {
          return withResponse("ai_help", {
            type: "list",
            message: "I can guide you for these certificates:\n\n📄 **Income Certificate** — for schemes & scholarships\n🏷️ **Community/Caste Certificate** — OBC/SC/ST reservations\n🪪 **Aadhaar Card** — universal ID\n🎓 **Scholarship** — education funding\n🏠 **Domicile Certificate** — residency proof\n👶 **Birth Certificate** — date of birth proof\n💳 **PAN Card** — tax & banking ID\n\nJust tell me which one you need help with!",
          });
        }

        return withResponse("ai_unknown", {
          type: "unknown",
          message: "I didn't quite catch that. I can help you with government certificates like Income, Community/Caste, Aadhaar, Scholarship, Domicile, Birth Certificate, or PAN. Try saying: \"I need an Income Certificate\" or \"Help with scholarship application\".",
        });
      }),
  }),

  official: router({
    dashboard: publicProcedure.input(z.object({ department: z.string().optional(), priority: z.union([prioritySchema, z.literal("All")]).optional(), location: z.string().optional() }).optional()).query(({ input }) => {
      const department = input?.department ?? "MahaDBT";
      const requests = store.requests.filter((request) => request.departments.includes(department)).filter((request) => !input?.priority || input.priority === "All" || request.priority === input.priority).filter((request) => !input?.location || request.location.address.toLowerCase().includes(input.location.toLowerCase()));
      const total = store.requests.length;
      const completed = store.requests.filter((request) => request.overallStatus === "completed").length;
      const resolutionHours = store.requests.filter((request) => request.overallStatus === "completed").map((request) => Math.max(1, (new Date(request.statusPerDepartment[0]?.lastUpdated ?? request.timestamp).getTime() - new Date(request.timestamp).getTime()) / 3600000));
      const avgResolution = resolutionHours.length ? resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length : 18.4;
      const clusters = clusterReports(requests);
      return withResponse("Official dashboard loaded", {
        requests,
        clusters,
        analytics: {
          totalRequests: total,
          slaCompliance: Math.round((completed / Math.max(1, total)) * 100),
          avgResolutionHours: Number(avgResolution.toFixed(1)),
          clusterCount: clusters.length,
        },
        department,
      });
    }),
    clusters: publicProcedure.query(() => {
      const clusters = clusterReports(store.requests);
      return withResponse("NLP semantic clusters generated", clusters);
    }),
    action: publicProcedure.input(z.object({ trackingId: z.string(), department: z.string(), action: z.enum(["Approve", "Reject", "Forward"]), note: z.string().optional() })).mutation(({ input }) => {
      const request = getRequest(input.trackingId);
      const status = request?.statusPerDepartment.find((item) => item.department === input.department);
      if (!request || !status) return { success: false as const, message: "Assigned request not found.", data: null };
      if (input.action === "Approve") { status.status = "success"; status.externalRefId ??= `${input.department.slice(0, 3).toUpperCase()}-${nanoid(6).toUpperCase()}`; status.note = input.note ?? "Accepted & Approved by assigned official"; }
      if (input.action === "Reject") { status.status = "failed"; status.note = input.note ?? "Rejected by assigned official — manual review required"; }
      if (input.action === "Forward") { status.status = "retrying"; status.retryCount = Math.min(3, status.retryCount + 1); status.note = input.note ?? "Forwarded to the next department queue"; }
      status.lastUpdated = new Date().toISOString();
      request.overallStatus = overallStatus(request.statusPerDepartment);
      appendAudit(`OFFICIAL_${input.action.toUpperCase()}`, demoUser("official")?.name ?? "Official User", `${input.trackingId} · ${input.department} · ${input.action}`);
      return withResponse(`Request ${input.action.toLowerCase()}d`, request);
    }),
  }),
  admin: router({
    overview: publicProcedure.query(() => withResponse("Admin overview loaded", { departments: store.departments.map((department) => ({ ...department, processedToday: store.requests.filter((request) => request.departments.includes(department.name)).length, successRate: 92 })), rules: store.routingRules, users: store.users, auditLog: store.auditLog })),
    toggleConnector: publicProcedure.input(z.object({ department: z.string(), status: z.enum(["UP", "DELAYED", "DOWN"]) })).mutation(({ input }) => {
      const department = updateConnector(input.department, input.status);
      if (!department) return { success: false as const, message: "Connector not found.", data: null };
      appendAudit("CONNECTOR_STATUS_CHANGED", demoUser("admin")?.name ?? "Admin User", `${input.department} set to ${input.status}`);
      return withResponse("Connector status updated", department);
    }),
    updateRule: publicProcedure.input(z.object({ id: z.string(), requestType: z.string().min(2), departments: z.array(z.string()).min(1), active: z.boolean() })).mutation(({ input }) => {
      const rule = store.routingRules.find((candidate) => candidate.id === input.id);
      if (rule) Object.assign(rule, input);
      else store.routingRules.push({ ...input });
      appendAudit("ROUTING_RULE_UPDATED", demoUser("admin")?.name ?? "Admin User", `${input.requestType} → ${input.departments.join(", ")}`);
      return withResponse("Routing rule saved", rule ?? input);
    }),
  }),
});

export type AppRouter = typeof appRouter;
