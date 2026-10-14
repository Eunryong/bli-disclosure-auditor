import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createPublicClient, formatEther, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  anchorAuditOnChain,
  deployAllAuditContracts,
} from "../src/lib/onchain";

const prisma = new PrismaClient();

function parseEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
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

function sha256Hex(content: string): string {
  const digest = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  return `0x${digest}`;
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
  const envPath = path.join(process.cwd(), ".env");
  const envVars = parseEnvFile(envPath);

  const sepoliaRpcUrl =
    envVars.SEPOLIA_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    "https://ethereum-sepolia-rpc.publicnode.com";
  const sepoliaPrivateKey = (envVars.SEPOLIA_DEPLOYER_PRIVATE_KEY ||
    process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY) as Hex | undefined;

  if (!sepoliaPrivateKey || !/^0x[0-9a-fA-F]{64}$/.test(sepoliaPrivateKey)) {
    console.error(
      "❌ SEPOLIA_DEPLOYER_PRIVATE_KEY가 .env에 설정되어 있지 않습니다. 먼저 `npm run wallet:setup`을 실행하세요."
    );
    process.exit(1);
  }

  const account = privateKeyToAccount(sepoliaPrivateKey);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaRpcUrl, { timeout: 15000 }),
  });

  const [blockNumber, balanceWei] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.getBalance({ address: account.address }),
  ]);

  console.log("================================================================================");
  console.log("🌐 [Ethereum Sepolia Testnet Deployment] (Chain ID: 11155111)");
  console.log("================================================================================");
  console.log(`• Sepolia RPC URL       : ${sepoliaRpcUrl} (Block #${blockNumber})`);
  console.log(`• Deployer Address      : ${account.address}`);
  console.log(`• Deployer Balance      : ${formatEther(balanceWei)} Sepolia ETH`);
  console.log(`• Etherscan Wallet      : https://sepolia.etherscan.io/address/${account.address}`);
  console.log("--------------------------------------------------------------------------------");

  if (balanceWei === 0n) {
    console.error(
      `\n❌ 배포 지갑(${account.address})의 Sepolia ETH 잔액이 0입니다.\n   위 주소로 약 0.01 ~ 0.03 Sepolia ETH를 전송한 뒤 다시 \`npm run contracts:deploy:sepolia\`를 실행해 주세요.`
    );
    process.exit(1);
  }

  // Configure runtime environment variables for deployAllAuditContracts()
  process.env.RPC_URL = sepoliaRpcUrl;
  process.env.DEPLOYER_PRIVATE_KEY = sepoliaPrivateKey;
  process.env.NEXT_PUBLIC_CHAIN_ID = "11155111";

  console.log("⏳ Deploying CompliantToken, MismatchedToken, and AuditRegistry to Sepolia...");
  const summary = await deployAllAuditContracts();

  if (summary.mode !== "EXTERNAL_RPC") {
    throw new Error("Expected EXTERNAL_RPC mode for Sepolia deployment, but fell back to EMBEDDED_EVM.");
  }

  console.log("\n✅ 3 Contracts Successfully Deployed on Ethereum Sepolia!");
  console.log(
    `  1) CompliantToken (BLIC) : ${summary.compliantToken.address}\n     • Contract : https://sepolia.etherscan.io/address/${summary.compliantToken.address}\n     • Deploy Tx: https://sepolia.etherscan.io/tx/${summary.compliantToken.txHash}`
  );
  console.log(
    `  2) MismatchedToken(BLIX) : ${summary.mismatchedToken.address}\n     • Contract : https://sepolia.etherscan.io/address/${summary.mismatchedToken.address}\n     • Deploy Tx: https://sepolia.etherscan.io/tx/${summary.mismatchedToken.txHash}`
  );
  console.log(
    `  3) AuditRegistry         : ${summary.auditRegistry.address}\n     • Contract : https://sepolia.etherscan.io/address/${summary.auditRegistry.address}\n     • Deploy Tx: https://sepolia.etherscan.io/tx/${summary.auditRegistry.txHash}`
  );

  // Persist active Sepolia configuration and deployed addresses to .env
  upsertEnvVars(envPath, {
    NEXT_PUBLIC_CHAIN_ID: "11155111",
    RPC_URL: sepoliaRpcUrl,
    DEPLOYER_PRIVATE_KEY: sepoliaPrivateKey,
    COMPLIANT_TOKEN_ADDRESS: summary.compliantToken.address,
    MISMATCHED_TOKEN_ADDRESS: summary.mismatchedToken.address,
    AUDIT_REGISTRY_ADDRESS: summary.auditRegistry.address,
  });
  process.env.COMPLIANT_TOKEN_ADDRESS = summary.compliantToken.address;
  process.env.MISMATCHED_TOKEN_ADDRESS = summary.mismatchedToken.address;
  process.env.AUDIT_REGISTRY_ADDRESS = summary.auditRegistry.address;

  // Update sample whitepaper markdown files
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

  // Sync SQLite DB seed cases & anchor BLIC on live Sepolia AuditRegistry
  const blicCase = await prisma.auditCase.findUnique({
    where: { id: "audit-compliant-blic" },
  });
  if (blicCase) {
    const newDocHash = updatedCompliantText
      ? sha256Hex(updatedCompliantText)
      : blicCase.documentHash;
    const reportHash =
      blicCase.reportHash ||
      sha256Hex(`blic-sepolia-report:${summary.compliantToken.address}`);

    console.log("\n⏳ Recording initial BLIC Audit Anchor on Sepolia AuditRegistry...");
    const anchorRes = await anchorAuditOnChain({
      documentHash: newDocHash,
      tokenAddress: summary.compliantToken.address,
      chainId: 11155111,
      blockNumber: summary.compliantToken.blockNumber,
      mismatchCount: 0,
      reportHash,
    });
    console.log(
      `  ✓ BLIC Anchor Tx: https://sepolia.etherscan.io/tx/${anchorRes.anchorTxHash} (verified=${anchorRes.verification.verified})`
    );

    await prisma.auditCase.update({
      where: { id: "audit-compliant-blic" },
      data: {
        tokenAddress: summary.compliantToken.address,
        chainId: 11155111,
        chainName: "Ethereum Sepolia",
        snapshotBlockNumber: summary.compliantToken.blockNumber,
        auditRegistryAddress: summary.auditRegistry.address,
        anchorTxHash: anchorRes.anchorTxHash,
        anchoredAt: new Date(anchorRes.anchoredAtIso),
        whitepaperText: updatedCompliantText || blicCase.whitepaperText,
        documentHash: newDocHash,
      },
    });
  }

  const blixCase = await prisma.auditCase.findUnique({
    where: { id: "audit-mismatched-blix" },
  });
  if (blixCase) {
    await prisma.auditCase.update({
      where: { id: "audit-mismatched-blix" },
      data: {
        tokenAddress: summary.mismatchedToken.address,
        chainId: 11155111,
        chainName: "Ethereum Sepolia",
        snapshotBlockNumber: summary.mismatchedToken.blockNumber,
        auditRegistryAddress: summary.auditRegistry.address,
        whitepaperText: updatedMismatchedText || blixCase.whitepaperText,
        documentHash: updatedMismatchedText
          ? sha256Hex(updatedMismatchedText)
          : blixCase.documentHash,
      },
    });
  }

  console.log("\n================================================================================");
  console.log("🎉 Sepolia Deployment & SQLite Sync Complete!");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("❌ Sepolia deployment failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
