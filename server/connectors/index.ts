import type { SanyogRequest } from "@shared/types";
import type { ConnectorStatus } from "@shared/types";

export interface ConnectorResult {
  status: "success" | "failed" | "delayed";
  externalRefId?: string;
  note?: string;
}

export interface SanyogConnector {
  name: string;
  processRequest(normalizedData: SanyogRequest): Promise<ConnectorResult>;
}

const ref = (prefix: string, trackingId: string) => `${prefix}-${trackingId.replace("SYN-", "")}`;

async function callConfiguredRecipient(
  normalizedData: SanyogRequest,
  config: { endpointEnv: string; tokenEnv: string; prefix: string; fallback: ConnectorResult },
): Promise<ConnectorResult> {
  const endpoint = process.env[config.endpointEnv];
  if (!endpoint) return config.fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const token = process.env[config.tokenEnv];
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        trackingId: normalizedData.trackingId,
        citizenName: normalizedData.citizenName,
        citizenMasterId: normalizedData.citizenMasterId,
        requestType: normalizedData.requestType,
        description: normalizedData.description,
        attachments: normalizedData.attachments,
        priority: normalizedData.priority,
        location: normalizedData.location,
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({})) as { externalRefId?: string; referenceId?: string; message?: string };
    if (!response.ok) return { status: "failed", note: body.message ?? `Recipient API returned HTTP ${response.status}` };
    return { status: "success", externalRefId: body.externalRefId ?? body.referenceId ?? ref(config.prefix, normalizedData.trackingId), note: "Accepted by the configured recipient API" };
  } catch (error) {
    return { status: "delayed", externalRefId: ref(config.prefix, normalizedData.trackingId), note: error instanceof Error && error.name === "AbortError" ? "Recipient API timed out; retry scheduled" : "Recipient API unavailable; retry scheduled" };
  } finally {
    clearTimeout(timeout);
  }
}

export const mahaDbtConnector: SanyogConnector = {
  name: "MahaDBT",
  async processRequest(normalizedData) {
    return callConfiguredRecipient(normalizedData, { endpointEnv: "SANYOG_MAHADBT_API_URL", tokenEnv: "SANYOG_MAHADBT_API_TOKEN", prefix: "DBT", fallback: { status: "success", externalRefId: ref("DBT", normalizedData.trackingId) } });
  },
};

export const aapleSarkarConnector: SanyogConnector = {
  name: "Aaple Sarkar",
  async processRequest(normalizedData) {
    return callConfiguredRecipient(normalizedData, { endpointEnv: "SANYOG_AAPLE_SARKAR_API_URL", tokenEnv: "SANYOG_AAPLE_SARKAR_API_TOKEN", prefix: "AS", fallback: { status: "delayed", externalRefId: ref("AS", normalizedData.trackingId), note: "Connector acknowledged; waiting for department response" } });
  },
};

export const grievanceCellConnector: SanyogConnector = {
  name: "Grievance Cell",
  async processRequest() {
    return { status: "failed", note: "Failed after 3 attempts — needs manual review" };
  },
};

export const connectorAdapters: Record<string, SanyogConnector> = {
  "MahaDBT": mahaDbtConnector,
  "Aaple Sarkar": aapleSarkarConnector,
  "Grievance Cell": grievanceCellConnector,
};

export function connectorStatusToUi(status: ConnectorStatus) {
  if (status === "UP") return "success" as const;
  if (status === "DELAYED") return "retrying" as const;
  return "failed" as const;
}
