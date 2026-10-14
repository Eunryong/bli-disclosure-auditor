import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { getAuditCaseById } from "../src/lib/audit-service";
import { runOnchainComparisonForAuditCase } from "../src/lib/comparator";
import {
  detectCreCliBinary,
  executeCreAuditWorkflow,
  loadCreWorkflowConfig,
} from "../cre-workflow/src/index";

const SIMULATION_ARTIFACT_PATH = path.join(
  process.cwd(),
  "cre-workflow",
  "simulations",
  "latest-simulation.json"
);

function printDivider(char = "=", width = 88) {
  console.log(char.repeat(width));
}

async function main() {
  const startedAtIso = new Date().toISOString();
  const overallStartMs = Date.now();

  const config = loadCreWorkflowConfig();
  const cliDetection = detectCreCliBinary();

  printDivider("=");
  console.log(
    "🔗 CHAINLINK RUNTIME ENVIRONMENT (CRE) WORKFLOW SIMULATOR — BLI LEGAL TECH HACKATHON 2"
  );
  printDivider("=");
  console.log(`• Workflow Name     : ${config.workflowName} (v${config.workflowVersion})`);
  console.log(`• Workflow Manifest : cre-workflow/workflow.yaml`);
  console.log(`• Workflow Config   : cre-workflow/config.json`);
  console.log(
    `• External CRE CLI  : ${
      cliDetection.detected
        ? `DETECTED (${cliDetection.binaryPath} — ${cliDetection.versionOutput})`
        : "NOT FOUND in PATH -> Using Deterministic Local CRE Runtime Simulator (OCR3-BFT)"
    }`
  );
  console.log(
    `• DON Configuration : ${config.don.donId} | Protocol: ${config.don.protocol} | Quorum: ${config.don.quorumThreshold}/${config.don.nodeCount} Nodes`
  );
  console.log(
    `• Target EVM Chain  : ${config.evm.chainName} (Chain ID: ${config.evm.chainId})`
  );
  printDivider("-");

  const targetCaseIds = ["audit-compliant-blic", "audit-mismatched-blix"];
  const simulationRuns: Array<Record<string, unknown>> = [];

  for (let idx = 0; idx < targetCaseIds.length; idx++) {
    const caseId = targetCaseIds[idx];
    const existingCase = await getAuditCaseById(caseId);
    if (!existingCase || !existingCase.checkItems) {
      throw new Error(
        `Seed audit case '${caseId}' not found in SQLite DB. Run 'npm run db:seed' first.`
      );
    }

    console.log(
      `\n▶ [Case ${idx + 1}/${targetCaseIds.length}] Executing CRE Workflow for ${existingCase.tokenSymbol} (${existingCase.projectName})`
    );
    console.log(`  - Audit Case ID   : ${existingCase.id}`);
    console.log(`  - Token Contract  : ${existingCase.tokenAddress}`);
    console.log(`  - Whitepaper File : ${existingCase.whitepaperFileName}`);
    console.log(`  - Document SHA256 : ${existingCase.documentHash}`);
    printDivider(".");

    // 1. Run full CRE workflow with on-chain AuditRegistry write & verifyAnchor enabled
    const workflowResult = await executeCreAuditWorkflow({
      auditCaseId: existingCase.id,
      tokenSymbol: existingCase.tokenSymbol,
      tokenAddress: existingCase.tokenAddress,
      chainId: existingCase.chainId,
      chainName: existingCase.chainName,
      documentHash: existingCase.documentHash,
      whitepaperText: existingCase.whitepaperText,
      checkItems: existingCase.checkItems,
      executeOnchainAnchor: true,
    });

    // 2. Sync comparison results and CRE workflow trace into SQLite DB via runOnchainComparisonForAuditCase
    await runOnchainComparisonForAuditCase(existingCase.id);

    // Also persist the latest trace (including Step 4 anchor execution) into SQLite onchainSnapshotJson
    const refreshed = await getAuditCaseById(existingCase.id);
    if (refreshed) {
      let existingSnap: Record<string, unknown> = {};
      try {
        existingSnap = refreshed.onchainSnapshotJson
          ? JSON.parse(refreshed.onchainSnapshotJson)
          : {};
      } catch {
        existingSnap = {};
      }
      existingSnap.creWorkflowTrace = workflowResult.trace;
      await prisma.auditCase.update({
        where: { id: existingCase.id },
        data: {
          creWorkflowRunId: workflowResult.workflowRunId,
          onchainSnapshotJson: JSON.stringify(existingSnap, null, 2),
        },
      });
    }

    // 3. Print formatted step-by-step CRE Execution Logs
    for (const step of workflowResult.trace.steps) {
      console.log(
        `  ✔ ${step.title} (${step.durationMs} ms) [${step.capability}]`
      );
      console.log(`    └─ ${step.summary}`);
    }

    console.log("\n  📡 [DON OCR3-BFT Consensus Output]");
    console.log(`    • Workflow Run ID  : ${workflowResult.workflowRunId}`);
    console.log(
      `    • Quorum Reached   : ${workflowResult.consensus.quorumReached}/${workflowResult.consensus.nodeCount} Oracle Nodes (Required >= ${workflowResult.consensus.quorumRequired})`
    );
    console.log(
      `    • Consensus Digest : ${workflowResult.consensus.consensusDigest}`
    );
    console.log(`    • Report Hash      : ${workflowResult.reportHash}`);
    for (const sig of workflowResult.consensus.nodeSignatures) {
      console.log(
        `      - [${sig.nodeId}] signer=${sig.signerAddress} | obs=${sig.observationHash.slice(0, 18)}... | sig=${sig.signature.slice(0, 22)}...`
      );
    }

    console.log("\n  ⚖️  [5 Core Items — Disclosed Claim vs. On-Chain Fact]");
    for (const comp of workflowResult.comparisons) {
      const badge =
        comp.status === "MATCH"
          ? "[MATCH]             "
          : comp.status === "MISMATCH"
          ? "[MISMATCH]          "
          : "[NEEDS_HUMAN_REVIEW]";
      console.log(`    • ${badge} ${comp.itemKey}`);
      console.log(`      └─ On-chain Fact : ${comp.onchainState}`);
      console.log(`      └─ Evidence      : ${comp.evidenceFunctionOrSlot}`);
    }

    if (workflowResult.trace.breachSimulations?.length) {
      console.log(
        "\n  🔥 [Counterfactual Breach Simulation — Cloned EVM Sandbox Execution]"
      );
      for (const sim of workflowResult.trace.breachSimulations) {
        const simBadge =
          sim.outcome === "DEFENDED"
            ? "[DEFENDED / BLOCKED_BY_CODE]"
            : "[BREACH_SUCCEEDED]          ";
        console.log(`    • ${simBadge} ${sim.titleKo}`);
        console.log(
          `      └─ Action        : [${sim.targetFunction}] ${sim.adversarialActionKo} (Gas: ${sim.gasUsed})`
        );
        console.log(
          `      └─ Before -> After: ${sim.beforeState}  ==>  ${sim.afterState}`
        );
      }
    }

    console.log(
      `\n  🏛️  [Step 4: On-Chain AuditRegistry Anchor & Verification]`
    );
    console.log(
      `    • Overall Verdict  : ${workflowResult.overallStatus} (MATCH=${workflowResult.matchCount}, MISMATCH=${workflowResult.mismatchCount}, NEEDS_HUMAN_REVIEW=${workflowResult.needsReviewCount})`
    );
    console.log(
      `    • AuditRegistry    : ${workflowResult.trace.auditRegistryPayload.auditRegistryAddress}`
    );
    if (workflowResult.anchorResult) {
      console.log(
        `    • Anchor Tx Hash   : ${workflowResult.anchorResult.anchorTxHash} (Block #${workflowResult.anchorResult.blockNumber}, Gas: ${workflowResult.anchorResult.gasUsed})`
      );
      console.log(
        `    • verifyAnchor()   : verified=${workflowResult.anchorResult.verification.verified} | onchainMismatchCount=${workflowResult.anchorResult.verification.onchainMismatchCount} | anchoredAt=${workflowResult.anchorResult.anchoredAtIso}`
      );
    }
    console.log(
      `    • Total Run Time   : ${workflowResult.trace.totalDurationMs} ms`
    );
    printDivider("-");

    simulationRuns.push({
      auditCaseId: existingCase.id,
      projectName: existingCase.projectName,
      tokenSymbol: existingCase.tokenSymbol,
      tokenAddress: workflowResult.snapshot.tokenAddress,
      documentHash: existingCase.documentHash,
      workflowRunId: workflowResult.workflowRunId,
      overallStatus: workflowResult.overallStatus,
      counts: {
        matchCount: workflowResult.matchCount,
        mismatchCount: workflowResult.mismatchCount,
        needsReviewCount: workflowResult.needsReviewCount,
      },
      reportHash: workflowResult.reportHash,
      consensusDigest: workflowResult.consensus.consensusDigest,
      anchorTxHash: workflowResult.anchorResult?.anchorTxHash || null,
      verifyAnchorVerified:
        workflowResult.anchorResult?.verification.verified ?? false,
      trace: workflowResult.trace,
    });
  }

  const artifactDir = path.dirname(SIMULATION_ARTIFACT_PATH);
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const simulationArtifact = {
    simulationSuite: "BLI Legal Tech Hackathon 2 — Chainlink CRE Workflow Simulation",
    workflowName: config.workflowName,
    workflowVersion: config.workflowVersion,
    manifestPath: "cre-workflow/workflow.yaml",
    configPath: "cre-workflow/config.json",
    cliBinaryDetected: cliDetection.detected,
    runtimeEngine: cliDetection.detected
      ? "chainlink-cre-cli"
      : "chainlink-cre-local-simulator",
    executedAt: startedAtIso,
    totalDurationMs: Date.now() - overallStartMs,
    casesSimulated: simulationRuns.length,
    runs: simulationRuns,
  };

  fs.writeFileSync(
    SIMULATION_ARTIFACT_PATH,
    JSON.stringify(simulationArtifact, null, 2),
    "utf8"
  );

  console.log(
    `\n✅ CRE Workflow Simulation Complete! (${simulationRuns.length} token cases verified in ${
      Date.now() - overallStartMs
    } ms)`
  );
  console.log(
    `📄 Simulation Artifact Saved: cre-workflow/simulations/latest-simulation.json`
  );
  printDivider("=");
}

main()
  .catch((err) => {
    console.error("❌ CRE Workflow Simulation failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
