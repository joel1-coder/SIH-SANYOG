import { getRule } from "./demoStore";

export function resolveDepartments(requestType: string, selectedDepartments: string[]) {
  const rule = getRule(requestType);
  if (!rule) return [];
  const allowed = new Set(rule.departments);
  return selectedDepartments.filter((department) => allowed.has(department));
}

export function getAllowedDepartments(requestType: string) {
  return getRule(requestType)?.departments ?? [];
}
