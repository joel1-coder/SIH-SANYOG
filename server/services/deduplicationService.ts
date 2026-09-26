import { store } from "./demoStore";

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
}

export function jaccardSimilarity(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  const intersection = Array.from(a).filter((token) => b.has(token)).length;
  const union = new Set([...Array.from(a), ...Array.from(b)]).size;
  return union === 0 ? 0 : intersection / union;
}

export function isPotentialDuplicate(description: string, requestType: string) {
  return store.requests.some((request) => request.requestType === requestType && jaccardSimilarity(description, request.description) >= 0.8);
}
