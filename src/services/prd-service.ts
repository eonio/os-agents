import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AppConfig,
  CouncilDecision,
  PrdDiscussionItem,
  PrdState,
  RunRecord,
} from "../domain/types.js";

function toTitleCase(input: string): string {
  return input
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class PrdService {
  public constructor(private readonly config: AppConfig) {}

  public createInitialState(run: RunRecord): PrdState {
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

  public async writeDocument(prd: PrdState, markdown: string): Promise<void> {
    if (!prd.filePath) {
      throw new Error("PRD file path is missing.");
    }

    await mkdir(path.dirname(prd.filePath), { recursive: true });
    await writeFile(prd.filePath, markdown, "utf8");
  }

  public async syncDocumentToWorkspace(run: RunRecord, prd: PrdState, markdown: string): Promise<string> {
    const targetPath = path.join(run.workspacePath, "features", path.basename(prd.filePath ?? ""));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, markdown, "utf8");
    return targetPath;
  }

  public validateDocument(markdown: string): void {
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
      if (!markdown.includes(heading)) {
        throw new Error(`PRD validation failed: missing heading "${heading}".`);
      }
    }

    const plantUmlBlocks = markdown.match(/```plantuml[\s\S]*?```/g) ?? [];
    if (plantUmlBlocks.length < 3) {
      throw new Error("PRD validation failed: expected at least 3 PlantUML C4 diagrams.");
    }
  }

  public buildFinalSynopsis(decisions: CouncilDecision[]): string {
    return decisions.map((decision) => `${decision.itemTitle}: ${decision.summary}`).join(" ");
  }

  public buildArc42Checklist(): string[] {
    return [
      "Use ARC42 section numbering exactly.",
      "Write the document as a PRD in markdown.",
      "Include business scope, architecture, quality, delivery, and acceptance details.",
      "Embed PlantUML C4 diagrams for system context, containers, and components.",
      "Use concrete decisions, not placeholders.",
    ];
  }

  private buildDiscussionItems(): PrdDiscussionItem[] {
    return [
      {
        id: "goals-scope",
        title: "Goals, stakeholders, and scope",
        prompt:
          "Clarify the business problem, target users, measurable goals, key use cases, and what is out of scope.",
        maxRounds: 2,
        roundsCompleted: 0,
      },
      {
        id: "constraints-quality",
        title: "Constraints and quality targets",
        prompt:
          "Capture technical, operational, and product constraints, plus the quality attributes that must drive the solution.",
        maxRounds: 2,
        roundsCompleted: 0,
      },
      {
        id: "solution-design",
        title: "Solution design and building blocks",
        prompt:
          "Propose the architecture, bounded responsibilities, data boundaries, interfaces, and crosscutting concepts that best solve the feature.",
        maxRounds: 2,
        roundsCompleted: 0,
      },
      {
        id: "delivery-rollout",
        title: "Runtime, rollout, and risk",
        prompt:
          "Describe runtime flow, deployment impact, rollout strategy, acceptance criteria, risks, and the safest delivery plan.",
        maxRounds: 2,
        roundsCompleted: 0,
      },
    ];
  }
}
