import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { deployAllAuditContracts } from "../src/lib/onchain";

const prisma = new PrismaClient();

function sha256Hex(content: string): string {
  const digest = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  return `0x${digest}`;
}

function upsertEnvVars(envPath: string, vars: Record<string, string>) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}="${value}"`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content = content.trimEnd() + `\n${line}\n`;
    }
  }
  fs.writeFileSync(envPath, content.trimEnd() + "\n", "utf8");
}

function updateWhitepaperAddress(filePath: string, newAddress: string): string {
  if (!fs.existsSync(filePath)) return "";
  const raw = fs.readFileSync(filePath, "utf8");
  const updated = raw.replace(
    /(\*\*컨트랙트 주소\*\*:\s*`)0x[a-fA-F0-9]{40}(`)/,
    `$1${newAddress}$2`
  );
  fs.writeFileSync(filePath, updated, "utf8");
  return updated;
}

async function main() {
  console.log("==================================================================");
  console.log("🚀 Deploying BLI Audit Smart Contracts (CompliantToken, MismatchedToken, AuditRegistry)");
  console.log("==================================================================");

  const summary = await deployAllAuditContracts();

  console.log(`• Execution Mode       : ${summary.mode}`);
  console.log(`• Chain ID             : ${summary.chainId}`);
  console.log(`• Deployer Address     : ${summary.deployer}`);
  console.log(
    `• CompliantToken (BLIC): ${summary.compliantToken.address} (tx: ${summary.compliantToken.txHash}, block: #${summary.compliantToken.blockNumber})`
  );
  console.log(
    `• MismatchedToken(BLIX): ${summary.mismatchedToken.address} (tx: ${summary.mismatchedToken.txHash}, block: #${summary.mismatchedToken.blockNumber})`
  );
  console.log(
    `• AuditRegistry        : ${summary.auditRegistry.address} (tx: ${summary.auditRegistry.txHash}, block: #${summary.auditRegistry.blockNumber})`
  );

  // 1. Update .env with deployed contract addresses
  const envPath = path.join(process.cwd(), ".env");
  upsertEnvVars(envPath, {
    COMPLIANT_TOKEN_ADDRESS: summary.compliantToken.address,
    MISMATCHED_TOKEN_ADDRESS: summary.mismatchedToken.address,
    AUDIT_REGISTRY_ADDRESS: summary.auditRegistry.address,
  });
  console.log("✓ Updated .env with deployed contract addresses.");

  // 2. Update sample whitepapers so disclosed contract addresses match deployed addresses
  const compliantWpPath = path.join(process.cwd(), "samples", "compliant-whitepaper.md");
  const mismatchedWpPath = path.join(process.cwd(), "samples", "mismatched-whitepaper.md");

  const updatedCompliantText = updateWhitepaperAddress(
    compliantWpPath,
    summary.compliantToken.address
  );
  const updatedMismatchedText = updateWhitepaperAddress(
    mismatchedWpPath,
    summary.mismatchedToken.address
  );
  console.log("✓ Updated sample whitepaper markdown files with deployed contract addresses.");

  // 3. Sync SQLite DB seed records if they exist
  const compliantCases = await prisma.auditCase.findMany({
    where: {
      OR: [{ id: "audit-compliant-blic" }, { tokenSymbol: "BLIC" }],
    },
  });
  for (const c of compliantCases) {
    await prisma.auditCase.update({
      where: { id: c.id },
      data: {
        tokenAddress: summary.compliantToken.address,
        auditRegistryAddress: summary.auditRegistry.address,
        ...(updatedCompliantText && c.id === "audit-compliant-blic"
          ? {
              whitepaperText: updatedCompliantText,
              documentHash: sha256Hex(updatedCompliantText),
            }
          : {}),
      },
    });
  }

  const mismatchedCases = await prisma.auditCase.findMany({
    where: {
      OR: [{ id: "audit-mismatched-blix" }, { tokenSymbol: "BLIX" }],
    },
  });
  for (const c of mismatchedCases) {
    await prisma.auditCase.update({
      where: { id: c.id },
      data: {
        tokenAddress: summary.mismatchedToken.address,
        auditRegistryAddress: summary.auditRegistry.address,
        ...(updatedMismatchedText && c.id === "audit-mismatched-blix"
          ? {
              whitepaperText: updatedMismatchedText,
              documentHash: sha256Hex(updatedMismatchedText),
            }
          : {}),
      },
    });
  }

  console.log(
    `✓ Synced SQLite AuditCase records (BLIC: ${compliantCases.length}, BLIX: ${mismatchedCases.length}) with deployed addresses.`
  );
}

main()
  .catch((err) => {
    console.error("Contract deployment failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
