import crypto from "node:crypto";

export function createCitizenMasterId(linkedIdentity: string) {
  if (!linkedIdentity.trim()) throw new Error("A linked identity is required to create a Citizen Master ID");
  return `sha256:${crypto.createHash("sha256").update(linkedIdentity.trim()).digest("hex")}`;
}

export function normalizeCitizenMasterId(candidate: string | undefined, fallbackIdentity: string) {
  if (candidate?.startsWith("sha256:") && candidate.length > 16) return candidate;
  return createCitizenMasterId(fallbackIdentity);
}
