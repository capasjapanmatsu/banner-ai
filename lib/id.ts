// lib/id.ts
export function uid(prefix = "l") {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
