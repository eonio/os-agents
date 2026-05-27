import { randomUUID } from "node:crypto";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function makeRunId(feature: string): string {
  const base = slugify(feature) || "run";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}
