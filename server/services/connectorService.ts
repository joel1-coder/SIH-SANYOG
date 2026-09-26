import type { SanyogRequest, StatusPerDepartment } from "@shared/types";
import { connectorAdapters } from "../connectors";
import { appendAudit, getDepartment } from "./demoStore";

export async function dispatchToConnectors(normalizedData: SanyogRequest): Promise<StatusPerDepartment[]> {
  const statuses: StatusPerDepartment[] = [];
  for (const department of normalizedData.departments) {
    const connector = connectorAdapters[department];
    const registry = getDepartment(department);
    const lastUpdated = new Date().toISOString();
    if (!connector || !registry) {
      statuses.push({ department, status: "failed", retryCount: 3, lastUpdated, note: "No connector registered — needs manual review" });
      appendAudit("CONNECTOR_FAILED", "SANYOG Engine", `${department} has no registered connector for ${normalizedData.trackingId}`);
      continue;
    }
    const result = await connector.processRequest(normalizedData);
    if (result.status === "success") {
      statuses.push({ department, status: "success", retryCount: 0, lastUpdated, externalRefId: result.externalRefId });
      appendAudit("CONNECTOR_SUCCESS", "SANYOG Engine", `${department} accepted ${normalizedData.trackingId}`);
    } else if (result.status === "delayed") {
      statuses.push({ department, status: "retrying", retryCount: 1, lastUpdated, externalRefId: result.externalRefId, note: result.note ?? "Retry scheduled with exponential backoff: 1s → 2s → 4s" });
      appendAudit("CONNECTOR_RETRY", "SANYOG Engine", `${department} · attempt 1 of 3 for ${normalizedData.trackingId}`);
    } else {
      statuses.push({ department, status: "failed", retryCount: 3, lastUpdated, note: result.note ?? "Failed after 3 attempts — needs manual review" });
      appendAudit("MANUAL_REVIEW_REQUIRED", "SANYOG Engine", `${department} failed for ${normalizedData.trackingId}`);
    }
  }
  return statuses;
}
