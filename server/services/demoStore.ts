import type {
  AuditEntry,
  BootstrapData,
  ConnectorStatus,
  Department,
  RoutingRule,
  SanyogRequest,
  SanyogUser,
} from "@shared/types";

const now = () => new Date().toISOString();
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const departments: Department[] = [
  {
    id: "mahadbt",
    name: "MahaDBT",
    shortName: "DBT",
    description: "Scholarships, subsidies, and direct benefit transfers",
    connectorStatus: "UP",
    lastHeartbeat: now(),
    accent: "#0d9488",
  },
  {
    id: "aaple-sarkar",
    name: "Aaple Sarkar",
    shortName: "AS",
    description: "Certificates, civic services, and state applications",
    connectorStatus: "DELAYED",
    lastHeartbeat: now(),
    accent: "#2563eb",
  },
  {
    id: "grievance-cell",
    name: "Grievance Cell",
    shortName: "GC",
    description: "Citizen grievances and escalations",
    connectorStatus: "DOWN",
    lastHeartbeat: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    accent: "#dc2626",
  },
];

const users: SanyogUser[] = [
  { id: "citizen-001", name: "Ananya Deshmukh", email: "ananya@example.com", role: "citizen", status: "Active" },
  { id: "official-001", name: "Rahul Patil", email: "rahul.patil@mahadbt.gov.in", role: "official", department: "MahaDBT", status: "Active" },
  { id: "admin-001", name: "Meera Kulkarni", email: "meera.kulkarni@sanyog.gov.in", role: "admin", department: "Platform Operations", status: "Active" },
];

const routingRules: RoutingRule[] = [
  { id: "rule-1", requestType: "Scholarship", departments: ["MahaDBT", "Aaple Sarkar"], active: true },
  { id: "rule-2", requestType: "Income Certificate", departments: ["Aaple Sarkar"], active: true },
  { id: "rule-3", requestType: "Grievance", departments: ["Aaple Sarkar", "Grievance Cell"], active: true },
  { id: "rule-4", requestType: "Subsidy", departments: ["MahaDBT"], active: true },
];

const requests: SanyogRequest[] = [
  {
    id: "req-demo-1",
    trackingId: "SYN-7K2P4Q",
    citizenMasterId: "sha256:demo-ananya-001",
    citizenName: "Ananya Deshmukh",
    requestType: "Scholarship",
    description: "Post-matric scholarship application for the 2026 academic year.",
    location: { lat: 19.076, lng: 72.8777, address: "Dadar West, Mumbai, Maharashtra" },
    attachments: ["income-certificate.pdf"],
    departments: ["MahaDBT", "Aaple Sarkar"],
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    priority: "High",
    duplicateFlag: false,
    statusPerDepartment: [
      { department: "MahaDBT", status: "success", retryCount: 0, lastUpdated: new Date(Date.now() - 36 * 60 * 1000).toISOString(), externalRefId: "DBT-2026-8812" },
      { department: "Aaple Sarkar", status: "retrying", retryCount: 1, lastUpdated: new Date(Date.now() - 8 * 60 * 1000).toISOString(), note: "Connector acknowledged; waiting for department response" },
    ],
    overallStatus: "partial",
    slaDueAt: hoursFromNow(18),
  },
  {
    id: "req-demo-2",
    trackingId: "SYN-4M9R1T",
    citizenMasterId: "sha256:demo-ravi-018",
    citizenName: "Ravi Jadhav",
    requestType: "Grievance",
    description: "Streetlight outages across the lane have remained unresolved for two weeks.",
    location: { lat: 18.5204, lng: 73.8567, address: "Shivajinagar, Pune, Maharashtra" },
    attachments: [],
    departments: ["Aaple Sarkar", "Grievance Cell"],
    timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    priority: "Medium",
    duplicateFlag: false,
    statusPerDepartment: [
      { department: "Aaple Sarkar", status: "success", retryCount: 0, lastUpdated: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString(), externalRefId: "AS-2026-1920" },
      { department: "Grievance Cell", status: "failed", retryCount: 3, lastUpdated: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(), note: "Failed after 3 attempts — needs manual review" },
    ],
    overallStatus: "manual-review",
    slaDueAt: hoursFromNow(9),
  },
  {
    id: "req-demo-3",
    trackingId: "SYN-2B8N6X",
    citizenMasterId: "sha256:demo-sana-044",
    citizenName: "Sana Shaikh",
    requestType: "Income Certificate",
    description: "Request for an income certificate for an education application.",
    location: { lat: 19.2183, lng: 72.9781, address: "Thane West, Maharashtra" },
    attachments: ["salary-proof.pdf"],
    departments: ["Aaple Sarkar"],
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    priority: "Low",
    duplicateFlag: false,
    statusPerDepartment: [
      { department: "Aaple Sarkar", status: "success", retryCount: 0, lastUpdated: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), externalRefId: "AS-2026-1762" },
    ],
    overallStatus: "completed",
    slaDueAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

const auditLog: AuditEntry[] = [
  { id: "audit-1", action: "REQUEST_SUBMITTED", user: "Ananya Deshmukh", timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(), metadata: "SYN-7K2P4Q routed to 2 departments" },
  { id: "audit-2", action: "CONNECTOR_RETRY", user: "SANYOG Engine", timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), metadata: "Aaple Sarkar · attempt 1 of 3" },
  { id: "audit-3", action: "MANUAL_REVIEW_REQUIRED", user: "SANYOG Engine", timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(), metadata: "Grievance Cell failed for SYN-4M9R1T" },
];

export const store: BootstrapData = {
  departments: departments.map((department) => structuredClone(department)),
  routingRules: routingRules.map((rule) => structuredClone(rule)),
  requests: requests.map((request) => structuredClone(request)),
  users,
  auditLog: auditLog.map((entry) => structuredClone(entry)),
};

export function resetStore() {
  store.requests.splice(0, store.requests.length);
  store.requests.push(...requests.map((request) => structuredClone(request)));
  store.auditLog.splice(0, store.auditLog.length);
  store.auditLog.push(...auditLog.map((entry) => structuredClone(entry)));
  store.departments.splice(0, store.departments.length);
  store.departments.push(...departments.map((department) => structuredClone(department)));
  store.routingRules.splice(0, store.routingRules.length);
  store.routingRules.push(...routingRules.map((rule) => structuredClone(rule)));
}

export function getDepartment(name: string) {
  return store.departments.find((department) => department.name === name);
}

export function getRequest(trackingId: string) {
  return store.requests.find((request) => request.trackingId.toUpperCase() === trackingId.toUpperCase());
}

export function appendAudit(action: string, user: string, metadata: string) {
  store.auditLog.unshift({ id: `audit-${Date.now()}`, action, user, timestamp: now(), metadata });
}

export function updateConnector(name: string, status: ConnectorStatus) {
  const department = getDepartment(name);
  if (!department) return undefined;
  department.connectorStatus = status;
  department.lastHeartbeat = now();
  return department;
}

export function getRule(requestType: string) {
  return store.routingRules.find((rule) => rule.requestType === requestType && rule.active);
}
