import { randomUUID } from "node:crypto";
export function slugify(input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}
export function makeRunId(feature) {
    const base = slugify(feature) || "run";
    return `${base}-${randomUUID().slice(0, 8)}`;
}
export function renderTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}
//# sourceMappingURL=text.js.map