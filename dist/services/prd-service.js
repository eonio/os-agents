import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
function toTitleCase(input) {
    return input
        .split(/[\s-_]+/)
        .filter(Boolean)
        .map((segment) => segment[0].toUpperCase() + segment.slice(1))
        .join(" ");
}
function today() {
    return new Date().toISOString().slice(0, 10);
}
export class PrdService {
    config;
    constructor(config) {
        this.config = config;
    }
    normalizeDocument(markdown) {
        const trimmed = markdown.trim();
        const fencedMatch = trimmed.match(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/i);
        return fencedMatch ? fencedMatch[1].trim() : trimmed;
    }
    createInitialState(run) {
        const date = today();
        const version = "1.0.0";
        const fileName = `${run.featureSlug}-v${version}-${date}.md`;
        return {
            title: toTitleCase(run.feature),
            version,
            date,
            filePath: path.join(this.config.featuresRoot, fileName),
            discussionItems: this.buildDiscussionItems(),
        };
    }
    async writeDocument(prd, markdown) {
        if (!prd.filePath) {
            throw new Error("PRD file path is missing.");
        }
        await mkdir(path.dirname(prd.filePath), { recursive: true });
        await writeFile(prd.filePath, markdown, "utf8");
    }
    async syncDocumentToWorkspace(run, prd, markdown) {
        const targetPath = path.join(run.workspacePath, "features", path.basename(prd.filePath ?? ""));
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, markdown, "utf8");
        return targetPath;
    }
    validateDocument(markdown) {
        const normalized = this.normalizeDocument(markdown);
        const requiredHeadings = [
            "# PRD:",
            "## 1. Introduction and Goals",
            "## 2. Constraints",
            "## 3. Context and Scope",
            "## 4. Solution Strategy",
            "## 5. Building Block View",
            "## 6. Runtime View",
            "## 7. Deployment View",
            "## 8. Crosscutting Concepts",
            "## 9. Architectural Decisions",
            "## 10. Quality Requirements",
            "## 11. Risks and Technical Debt",
            "## 12. Glossary",
            "## Delivery Plan",
            "## Acceptance Criteria",
        ];
        for (const heading of requiredHeadings) {
            if (!normalized.includes(heading)) {
                throw new Error(`PRD validation failed: missing heading "${heading}".`);
            }
        }
        const plantUmlBlocks = normalized.match(/```plantuml[\s\S]*?```/g) ?? [];
        if (plantUmlBlocks.length < 3) {
            throw new Error("PRD validation failed: expected at least 3 PlantUML C4 diagrams.");
        }
    }
    async resolveDocument(run, prd, response) {
        const attemptedErrors = [];
        const normalizedResponse = response ? this.normalizeDocument(response) : undefined;
        if (normalizedResponse) {
            try {
                this.validateDocument(normalizedResponse);
                return normalizedResponse;
            }
            catch (error) {
                attemptedErrors.push(error instanceof Error ? error.message : String(error));
            }
        }
        const candidatePaths = [
            prd.filePath,
            prd.filePath ? path.join(run.workspacePath, "features", path.basename(prd.filePath)) : undefined,
        ].filter((candidate) => Boolean(candidate));
        for (const candidatePath of candidatePaths) {
            if (!(await this.wasUpdatedForRun(candidatePath, run.createdAt))) {
                continue;
            }
            const candidate = this.normalizeDocument(await readFile(candidatePath, "utf8"));
            try {
                this.validateDocument(candidate);
                return candidate;
            }
            catch (error) {
                attemptedErrors.push(error instanceof Error ? error.message : String(error));
            }
        }
        throw new Error(attemptedErrors[0] ?? "Hans did not produce a valid PRD document.");
    }
    buildFinalSynopsis(decisions) {
        return decisions.map((decision) => `${decision.itemTitle}: ${decision.summary}`).join(" ");
    }
    buildArc42Checklist() {
        return [
            "Use ARC42 section numbering exactly.",
            "Write the document as a PRD in markdown.",
            "Include business scope, architecture, quality, delivery, and acceptance details.",
            "Embed PlantUML C4 diagrams for system context, containers, and components.",
            "Use concrete decisions, not placeholders.",
        ];
    }
    async wasUpdatedForRun(filePath, createdAt) {
        try {
            await access(filePath);
            const details = await stat(filePath);
            return details.mtimeMs >= Date.parse(createdAt) - 1000;
        }
        catch {
            return false;
        }
    }
    buildDiscussionItems() {
        return [
            {
                id: "goals-scope",
                title: "Goals, stakeholders, and scope",
                prompt: "Clarify the business problem, target users, measurable goals, key use cases, and what is out of scope.",
                maxRounds: 2,
                roundsCompleted: 0,
            },
            {
                id: "constraints-quality",
                title: "Constraints and quality targets",
                prompt: "Capture technical, operational, and product constraints, plus the quality attributes that must drive the solution.",
                maxRounds: 2,
                roundsCompleted: 0,
            },
            {
                id: "solution-design",
                title: "Solution design and building blocks",
                prompt: "Propose the architecture, bounded responsibilities, data boundaries, interfaces, and crosscutting concepts that best solve the feature.",
                maxRounds: 2,
                roundsCompleted: 0,
            },
            {
                id: "delivery-rollout",
                title: "Runtime, rollout, and risk",
                prompt: "Describe runtime flow, deployment impact, rollout strategy, acceptance criteria, risks, and the safest delivery plan.",
                maxRounds: 2,
                roundsCompleted: 0,
            },
        ];
    }
}
//# sourceMappingURL=prd-service.js.map