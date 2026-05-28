import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PrdService } from "../src/services/prd-service.js";
import { createTestConfig } from "./helpers.js";

const VALID_PRD = `# PRD: Sample

## Metadata

## 1. Introduction and Goals
## 2. Constraints
## 3. Context and Scope
\`\`\`plantuml
@startuml
title context
@enduml
\`\`\`
## 4. Solution Strategy
## 5. Building Block View
\`\`\`plantuml
@startuml
title container
@enduml
\`\`\`
## 6. Runtime View
## 7. Deployment View
\`\`\`plantuml
@startuml
title component
@enduml
\`\`\`
## 8. Crosscutting Concepts
## 9. Architectural Decisions
## 10. Quality Requirements
## 11. Risks and Technical Debt
## 12. Glossary
## Delivery Plan
## Acceptance Criteria
`;

describe("PrdService", () => {
  it("accepts markdown wrapped in a fenced block", async () => {
    const config = await createTestConfig("prd-service");
    const service = new PrdService(config);

    expect(() => service.validateDocument(`\`\`\`markdown\n${VALID_PRD}\n\`\`\``)).not.toThrow();
  });

  it("falls back to a generated PRD file when the assistant response is only a status message", async () => {
    const config = await createTestConfig("prd-service");
    const service = new PrdService(config);
    const filePath = path.join(config.featuresRoot, "sample-v1.0.0-2026-05-28.md");
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, VALID_PRD, "utf8");

    const run = {
      id: "run-1",
      createdAt: new Date().toISOString(),
      workspacePath: path.join(config.workspaceRoot, "run-1"),
    };

    const resolved = await service.resolveDocument(
      run,
      { discussionItems: [], filePath },
      "Created the PRD at the requested path.",
    );

    expect(resolved).toContain("# PRD: Sample");
  });
});
