import fs from "node:fs";
import path from "node:path";
import { createPublicClient, formatEther, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const DEFAULT_SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const FALLBACK_SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
  "https://rpc.sepolia.org",
];

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

async function querySepoliaBalance(address: Hex, preferredRpcUrl: string) {
  const rpcCandidates = [
    preferredRpcUrl,
    ...FALLBACK_SEPOLIA_RPCS.filter((u) => u !== preferredRpcUrl),
  ];

  let lastError: unknown = null;
  for (const rpcUrl of rpcCandidates) {
    try {
      const client = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, { timeout: 8000 }),
      });
      const [blockNumber, balanceWei] = await Promise.all([
        client.getBlockNumber(),
        client.getBalance({ address }),
      ]);
      return {
        rpcUrl,
        blockNumber: Number(blockNumber),
        balanceWei,
        balanceEth: formatEther(balanceWei),
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to connect to Sepolia RPC endpoints.");
}

async function main() {
  const envPath = path.join(process.cwd(), ".env");
  const existingEnv = parseEnvFile(envPath);
  const forceRegenerate = process.argv.includes("--regenerate");

  let privateKey = existingEnv.SEPOLIA_DEPLOYER_PRIVATE_KEY as Hex | undefined;
  let isNewlyGenerated = false;

  if (
    !privateKey ||
    !/^0x[0-9a-fA-F]{64}$/.test(privateKey) ||
    forceRegenerate
  ) {
    privateKey = generatePrivateKey();
    isNewlyGenerated = true;
  }

  const account = privateKeyToAccount(privateKey);
  const sepoliaRpcUrl = existingEnv.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC_URL;

  upsertEnvVars(envPath, {
    SEPOLIA_RPC_URL: sepoliaRpcUrl,
    SEPOLIA_DEPLOYER_PRIVATE_KEY: privateKey,
    SEPOLIA_DEPLOYER_ADDRESS: account.address,
  });

  console.log("================================================================================");
  console.log("🔐 [Sepolia Ephemeral Deployer Wallet Setup] (Chain ID: 11155111)");
  console.log("================================================================================");
  console.log(
    `• Wallet Status         : ${
      isNewlyGenerated
        ? "NEWLY GENERATED & SAVED TO .env"
        : "LOADED EXISTING WALLET FROM .env"
    }`
  );
  console.log(`• Deployer Address      : ${account.address}`);
  console.log(`• Etherscan Wallet Link : https://sepolia.etherscan.io/address/${account.address}`);
  console.log(`• Configured RPC URL    : ${sepoliaRpcUrl}`);
  console.log(`• Secret Storage        : .env -> SEPOLIA_DEPLOYER_PRIVATE_KEY (gitignored)`);
  console.log("--------------------------------------------------------------------------------");

  try {
    const status = await querySepoliaBalance(account.address, sepoliaRpcUrl);
    console.log(`• Connected Sepolia RPC : ${status.rpcUrl} (Latest Block: #${status.blockNumber})`);
    console.log(`• Current Balance       : ${status.balanceEth} Sepolia ETH (${status.balanceWei.toString()} wei)`);
    console.log("--------------------------------------------------------------------------------");

    if (status.balanceWei === 0n) {
      console.log("💡 [Next Step — 입금 안내]");
      console.log(`  1) 위 배포 지갑 주소(${account.address})로 약 0.01 ~ 0.03 Sepolia ETH를 전송하세요.`);
      console.log("  2) 전송 후 아래 명령어를 실행하면 3종 컨트랙트(CompliantToken, MismatchedToken, AuditRegistry)가");
      console.log("     실제 Sepolia 테스트넷에 배포되고 .env 및 SQLite DB에 자동 반영됩니다:");
      console.log("     👉 npm run contracts:deploy:sepolia");
    } else {
      console.log("✅ 지갑에 Sepolia ETH 잔액이 확인되었습니다! 지금 바로 아래 명령어로 배포할 수 있습니다:");
      console.log("   👉 npm run contracts:deploy:sepolia");
    }
  } catch (err: any) {
    console.log(`⚠️ Sepolia RPC 잔액 조회 실패 (네트워크 확인 필요): ${err?.message || err}`);
  }
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Failed to setup Sepolia wallet:", err);
  process.exit(1);
});
