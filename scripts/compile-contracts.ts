import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const CONTRACTS_DIR = path.join(process.cwd(), "contracts");
const ARTIFACTS_DIR = path.join(CONTRACTS_DIR, "artifacts");

const CONTRACT_FILES = [
  "CompliantToken.sol",
  "MismatchedToken.sol",
  "AuditRegistry.sol",
];

function main() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const sources: Record<string, { content: string }> = {};
  for (const fileName of CONTRACT_FILES) {
    const fullPath = path.join(CONTRACTS_DIR, fileName);
    sources[fileName] = {
      content: fs.readFileSync(fullPath, "utf8"),
    };
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };

  console.log(`Compiling ${CONTRACT_FILES.length} Solidity contracts with solc ${solc.version()}...`);
  const rawOutput = solc.compile(JSON.stringify(input));
  const output = JSON.parse(rawOutput);

  if (output.errors) {
    let hasError = false;
    for (const err of output.errors) {
      if (err.severity === "error") {
        hasError = true;
        console.error(`[SOLC ERROR] ${err.formattedMessage}`);
      } else {
        console.warn(`[SOLC WARNING] ${err.formattedMessage}`);
      }
    }
    if (hasError) {
      process.exit(1);
    }
  }

  for (const fileName of CONTRACT_FILES) {
    const fileContracts = output.contracts[fileName];
    for (const [contractName, contractData] of Object.entries<any>(fileContracts)) {
      const artifact = {
        contractName,
        sourceName: `contracts/${fileName}`,
        compilerVersion: solc.version(),
        abi: contractData.abi,
        bytecode: `0x${contractData.evm.bytecode.object}`,
        deployedBytecode: `0x${contractData.evm.deployedBytecode.object}`,
      };

      const artifactPath = path.join(ARTIFACTS_DIR, `${contractName}.json`);
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), "utf8");
      console.log(
        `  ✓ Compiled ${contractName} (${fileName}) -> contracts/artifacts/${contractName}.json (bytecode: ${
          contractData.evm.bytecode.object.length / 2
        } bytes, ABI entries: ${contractData.abi.length})`
      );
    }
  }

  console.log("All 3 Solidity contracts compiled successfully with 0 errors.");
}

main();
