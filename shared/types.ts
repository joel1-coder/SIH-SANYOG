export type UserRole = "citizen" | "official" | "admin";
export type ConnectorStatus = "UP" | "DELAYED" | "DOWN";
export type DepartmentStatus = "pending" | "success" | "failed" | "retrying";
export type Priority = "Low" | "Medium" | "High";

export interface SanyogUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  status: "Active" | "Invited";
}

export interface Department {
  id: string;
  name: string;
  shortName: string;
  description: string;
  connectorStatus: ConnectorStatus;
  lastHeartbeat: string;
  accent: string;
}

export interface RoutingRule {
  id: string;
  requestType: string;
  departments: string[];
  active: boolean;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface StatusPerDepartment {
  department: string;
  status: DepartmentStatus;
  retryCount: number;
  lastUpdated: string;
  externalRefId?: string;
  note?: string;
}

export interface SanyogRequest {
  id: string;
  trackingId: string;
  citizenMasterId: string;
  citizenName: string;
  requestType: string;
  description: string;
  location: Location;
  attachments: string[];
  departments: string[];
  timestamp: string;
  priority: Priority;
  duplicateFlag: boolean;
  statusPerDepartment: StatusPerDepartment[];
  overallStatus: "partial" | "in-progress" | "completed" | "manual-review";
  slaDueAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  metadata: string;
}

export interface ConnectorView extends Department {
  processedToday: number;
  successRate: number;
}

export interface SubmitRequestInput {
  citizenName: string;
  citizenMasterId?: string;
  requestType: string;
  description: string;
  departments?: string[];
  location?: Location;
  attachments: string[];
  language: string;
  consent: boolean;
  priority?: Priority;
}

export interface DashboardFilters {
  department?: string;
  priority?: Priority | "All";
  location?: string;
}

export interface DashboardActionInput {
  trackingId: string;
  department: string;
  action: "Approve" | "Reject" | "Forward";
  note?: string;
}

export interface BootstrapData {
  departments: Department[];
  routingRules: RoutingRule[];
  requests: SanyogRequest[];
  users: SanyogUser[];
  auditLog: AuditEntry[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
