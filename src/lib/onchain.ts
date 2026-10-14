import fs from "node:fs";
import path from "node:path";
import { createEVM, type EVM } from "@ethereumjs/evm";
import {
  bytesToHex,
  createAddressFromString,
  hexToBytes,
} from "@ethereumjs/util";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  decodeFunctionResult,
  encodeDeployData,
  encodeFunctionData,
  formatUnits,
  getAddress,
  http,
  keccak256,
  toBytes,
  toHex,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, sepolia } from "viem/chains";

const ARTIFACTS_DIR = path.join(process.cwd(), "contracts", "artifacts");
const EVM_STATE_FILE = path.join(process.cwd(), "prisma", "evm-chain-state.json");

export const DEFAULT_DEPLOYER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
export const DEFAULT_DEPLOYER_ADDRESS =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
export const DEFAULT_COMPLIANT_TEAM_WALLET =
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
export const DEFAULT_MISMATCHED_TEAM_WALLET =
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;
export const DEFAULT_TREASURY_WALLET =
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as const;
export const DEFAULT_FEE_COLLECTOR_WALLET =
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" as const;

export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

export interface CompiledArtifact {
  contractName: string;
  sourceName: string;
  compilerVersion: string;
  abi: Abi;
  bytecode: Hex;
  deployedBytecode: Hex;
}

export interface PersistedEvmTx {
  txHash: Hex;
  blockNumber: number;
  timestamp: number;
  from: Hex;
  to: Hex | null;
  createdAddress?: Hex;
  inputData: Hex;
  gasUsed: string;
  label: string;
}

export interface PersistedEvmChainState {
  chainId: number;
  chainName: string;
  currentBlockNumber: number;
  deployerAddress: Hex;
  contracts: {
    CompliantToken: Hex;
    MismatchedToken: Hex;
    AuditRegistry: Hex;
  };
  transactions: PersistedEvmTx[];
}

export interface TokenOnchainSnapshot {
  mode: "EXTERNAL_RPC" | "EMBEDDED_EVM";
  executionMode: "EXTERNAL_RPC" | "EMBEDDED_EVM";
  chainId: number;
  chainName: string;
  blockNumber: number;
  tokenAddress: Hex;
  name: string;
  symbol: string;
  decimals: number;
  totalSupplyRaw: string;
  totalSupplyFormatted: string;
  MAX_SUPPLY: string;
  maxSupplyRaw: string;
  maxSupplyFormatted: string;
  isUncappedSupply: boolean;
  mintable: boolean;
  owner: Hex;
  ownerIsContract: boolean;
  transferFeeBps: number;
  maxTransferFeeBps: number;
  feeMutable: boolean;
  feeCollector: Hex;
  paused: boolean;
  pausable: boolean;
  blacklistable: boolean;
  teamWallet: Hex;
  teamAllocationRaw: string;
  teamAllocationFormatted: string;
  teamLockupActive: boolean;
  teamLockupReleaseTimestamp: number;
  teamLockupReleaseIso: string | null;
  upgradeable: boolean;
  adminAddress: Hex;
  adminIsContract: boolean;
  logicImplementation: Hex;
  eip1967SlotValue: Hex;
  eip1967ImplementationAddress: Hex;
  rawCallTraces: Array<{
    fn: string;
    calldata: Hex;
    rawHex: Hex;
    decoded: string;
  }>;
}

export interface AnchorTransactionResult {
  executionMode: "EXTERNAL_RPC" | "EMBEDDED_EVM";
  txHash: Hex;
  anchorTxHash: Hex;
  blockNumber: number;
  gasUsed: string;
  auditRegistryAddress: Hex;
  anchoredAtTimestamp: number;
  anchoredAtIso: string;
  recordAuditCalldata: Hex;
  verifyAnchorCalldata: Hex;
  verifyAnchorRawResult: Hex;
  verification: {
    verified: boolean;
    onchainBlockNumber: number;
    onchainMismatchCount: number;
    onchainAnchoredAt: number;
    auditorAddress: Hex;
    record: {
      documentHash: Hex;
      tokenAddress: Hex;
      chainId: number;
      blockNumber: number;
      mismatchCount: number;
      reportHash: Hex;
      auditor: Hex;
      anchoredAt: number;
    };
  };
}

export function loadContractArtifact(
  contractName: "CompliantToken" | "MismatchedToken" | "AuditRegistry"
): CompiledArtifact {
  const artifactPath = path.join(ARTIFACTS_DIR, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Compiled artifact not found at ${artifactPath}. Run 'npm run contracts:compile' first.`
    );
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")) as CompiledArtifact;
}

function makeEvmBlock(blockNumber: number, timestampSec: number, coinbaseHex: string) {
  return {
    header: {
      number: BigInt(blockNumber),
      timestamp: BigInt(timestampSec),
      coinbase: createAddressFromString(coinbaseHex),
      difficulty: 0n,
      prevRandao: new Uint8Array(32),
      gasLimit: 30_000_000n,
      baseFeePerGas: 7n,
      excessBlobGas: 0n,
      getBlobGasPrice: () => 1n,
    },
  } as any;
}

function computeDeterministicTxHash(
  from: string,
  to: string | null,
  inputData: Hex,
  blockNumber: number,
  txIndex: number
): Hex {
  return keccak256(
    toBytes(
      `${from.toLowerCase()}:${(to || "CREATE").toLowerCase()}:${inputData}:${blockNumber}:${txIndex}`
    )
  );
}

/**
 * Checks whether an external JSON-RPC node is configured and reachable.
 */
async function getReachableRpcClient() {
  const persisted = getPersistedContractsInfo();
  const rpcUrl = (
    process.env.RPC_URL ||
    (persisted?.chainId === 11155111 ? process.env.SEPOLIA_RPC_URL : "")
  )?.trim();
  if (!rpcUrl) return null;

  try {
    const isSepoliaUrl =
      rpcUrl.toLowerCase().includes("sepolia") ||
      process.env.NEXT_PUBLIC_CHAIN_ID === "11155111" ||
      persisted?.chainId === 11155111;
    const chainId = isSepoliaUrl
      ? 11155111
      : Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
    const chain = chainId === 11155111 ? sepolia : foundry;
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl, { timeout: 12000 }),
    });
    const blockNumber = await publicClient.getBlockNumber();
    const privateKey = (process.env.DEPLOYER_PRIVATE_KEY ||
      process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY ||
      DEFAULT_DEPLOYER_PRIVATE_KEY) as Hex;
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl, { timeout: 15000 }),
    });
    return {
      publicClient,
      walletClient,
      account,
      chainId,
      chainName:
        chainId === 11155111 ? "Ethereum Sepolia" : "Local EVM RPC Node",
      blockNumber: Number(blockNumber),
    };
  } catch {
    return null;
  }
}

/**
 * Deploys CompliantToken, MismatchedToken, and AuditRegistry to either the external RPC node
 * or the persistent Embedded EVM state file (`prisma/evm-chain-state.json`).
 */
export async function deployAllAuditContracts(): Promise<{
  mode: "EXTERNAL_RPC" | "EMBEDDED_EVM";
  chainId: number;
  deployer: Hex;
  compliantToken: { address: Hex; txHash: Hex; blockNumber: number };
  mismatchedToken: { address: Hex; txHash: Hex; blockNumber: number };
  auditRegistry: { address: Hex; txHash: Hex; blockNumber: number };
  state: PersistedEvmChainState;
}> {
  const compliantArtifact = loadContractArtifact("CompliantToken");
  const mismatchedArtifact = loadContractArtifact("MismatchedToken");
  const registryArtifact = loadContractArtifact("AuditRegistry");

  const rpc = await getReachableRpcClient();
  if (rpc) {
    const { publicClient, walletClient, account, chainId, chainName } = rpc;
    const txs: PersistedEvmTx[] = [];

    // 1. Deploy CompliantToken
    const c1Data = encodeDeployData({
      abi: compliantArtifact.abi,
      bytecode: compliantArtifact.bytecode,
      args: [
        DEFAULT_COMPLIANT_TEAM_WALLET,
        DEFAULT_TREASURY_WALLET,
        DEFAULT_FEE_COLLECTOR_WALLET,
      ],
    });
    const hash1 = await walletClient.deployContract({
      abi: compliantArtifact.abi,
      bytecode: compliantArtifact.bytecode,
      args: [
        DEFAULT_COMPLIANT_TEAM_WALLET,
        DEFAULT_TREASURY_WALLET,
        DEFAULT_FEE_COLLECTOR_WALLET,
      ],
    });
    const receipt1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });
    const compliantAddr = getAddress(receipt1.contractAddress!);
    txs.push({
      txHash: hash1,
      blockNumber: Number(receipt1.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      from: account.address,
      to: null,
      createdAddress: compliantAddr,
      inputData: c1Data,
      gasUsed: receipt1.gasUsed.toString(),
      label: "Deploy CompliantToken",
    });

    // 2. Deploy MismatchedToken
    const c2Data = encodeDeployData({
      abi: mismatchedArtifact.abi,
      bytecode: mismatchedArtifact.bytecode,
      args: [
        DEFAULT_MISMATCHED_TEAM_WALLET,
        DEFAULT_TREASURY_WALLET,
        DEFAULT_FEE_COLLECTOR_WALLET,
      ],
    });
    const hash2 = await walletClient.deployContract({
      abi: mismatchedArtifact.abi,
      bytecode: mismatchedArtifact.bytecode,
      args: [
        DEFAULT_MISMATCHED_TEAM_WALLET,
        DEFAULT_TREASURY_WALLET,
        DEFAULT_FEE_COLLECTOR_WALLET,
      ],
    });
    const receipt2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });
    const mismatchedAddr = getAddress(receipt2.contractAddress!);
    txs.push({
      txHash: hash2,
      blockNumber: Number(receipt2.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      from: account.address,
      to: null,
      createdAddress: mismatchedAddr,
      inputData: c2Data,
      gasUsed: receipt2.gasUsed.toString(),
      label: "Deploy MismatchedToken",
    });

    // 3. Deploy AuditRegistry
    const c3Data = encodeDeployData({
      abi: registryArtifact.abi,
      bytecode: registryArtifact.bytecode,
      args: [],
    });
    const hash3 = await walletClient.deployContract({
      abi: registryArtifact.abi,
      bytecode: registryArtifact.bytecode,
      args: [],
    });
    const receipt3 = await publicClient.waitForTransactionReceipt({ hash: hash3 });
    const registryAddr = getAddress(receipt3.contractAddress!);
    txs.push({
      txHash: hash3,
      blockNumber: Number(receipt3.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      from: account.address,
      to: null,
      createdAddress: registryAddr,
      inputData: c3Data,
      gasUsed: receipt3.gasUsed.toString(),
      label: "Deploy AuditRegistry",
    });

    const state: PersistedEvmChainState = {
      chainId,
      chainName,
      currentBlockNumber: Number(receipt3.blockNumber),
      deployerAddress: account.address,
      contracts: {
        CompliantToken: compliantAddr,
        MismatchedToken: mismatchedAddr,
        AuditRegistry: registryAddr,
      },
      transactions: txs,
    };
    fs.writeFileSync(EVM_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
    return {
      mode: "EXTERNAL_RPC",
      chainId,
      deployer: account.address,
      compliantToken: {
        address: compliantAddr,
        txHash: hash1,
        blockNumber: Number(receipt1.blockNumber),
      },
      mismatchedToken: {
        address: mismatchedAddr,
        txHash: hash2,
        blockNumber: Number(receipt2.blockNumber),
      },
      auditRegistry: {
        address: registryAddr,
        txHash: hash3,
        blockNumber: Number(receipt3.blockNumber),
      },
      state,
    };
  }

  // Fallback: Execute actual EVM CREATE deployments inside @ethereumjs/evm
  const evm = await createEVM();
  const caller = createAddressFromString(DEFAULT_DEPLOYER_ADDRESS);
  const baseBlock = 7849200;
  const baseTimestamp = 1760418000;
  const transactions: PersistedEvmTx[] = [];

  // 1. Deploy CompliantToken (BLIC)
  const deployCompliantHex = encodeDeployData({
    abi: compliantArtifact.abi,
    bytecode: compliantArtifact.bytecode,
    args: [
      DEFAULT_COMPLIANT_TEAM_WALLET,
      DEFAULT_TREASURY_WALLET,
      DEFAULT_FEE_COLLECTOR_WALLET,
    ],
  });
  const res1 = await evm.runCall({
    caller,
    data: hexToBytes(deployCompliantHex),
    gasLimit: 10_000_000n,
    block: makeEvmBlock(baseBlock + 1, baseTimestamp + 12, DEFAULT_DEPLOYER_ADDRESS),
  });
  if (res1.execResult.exceptionError || !res1.createdAddress) {
    throw new Error(
      `CompliantToken EVM deployment failed: ${res1.execResult.exceptionError?.error}`
    );
  }
  const compliantAddress = getAddress(res1.createdAddress.toString());
  const txHash1 = computeDeterministicTxHash(
    DEFAULT_DEPLOYER_ADDRESS,
    null,
    deployCompliantHex,
    baseBlock + 1,
    0
  );
  transactions.push({
    txHash: txHash1,
    blockNumber: baseBlock + 1,
    timestamp: baseTimestamp + 12,
    from: DEFAULT_DEPLOYER_ADDRESS,
    to: null,
    createdAddress: compliantAddress,
    inputData: deployCompliantHex,
    gasUsed: res1.execResult.executionGasUsed.toString(),
    label: "Deploy CompliantToken (BLIC)",
  });

  // 2. Deploy MismatchedToken (BLIX)
  const deployMismatchedHex = encodeDeployData({
    abi: mismatchedArtifact.abi,
    bytecode: mismatchedArtifact.bytecode,
    args: [
      DEFAULT_MISMATCHED_TEAM_WALLET,
      DEFAULT_TREASURY_WALLET,
      DEFAULT_FEE_COLLECTOR_WALLET,
    ],
  });
  const res2 = await evm.runCall({
    caller,
    data: hexToBytes(deployMismatchedHex),
    gasLimit: 10_000_000n,
    block: makeEvmBlock(baseBlock + 2, baseTimestamp + 24, DEFAULT_DEPLOYER_ADDRESS),
  });
  if (res2.execResult.exceptionError || !res2.createdAddress) {
    throw new Error(
      `MismatchedToken EVM deployment failed: ${res2.execResult.exceptionError?.error}`
    );
  }
  const mismatchedAddress = getAddress(res2.createdAddress.toString());
  const txHash2 = computeDeterministicTxHash(
    DEFAULT_DEPLOYER_ADDRESS,
    null,
    deployMismatchedHex,
    baseBlock + 2,
    1
  );
  transactions.push({
    txHash: txHash2,
    blockNumber: baseBlock + 2,
    timestamp: baseTimestamp + 24,
    from: DEFAULT_DEPLOYER_ADDRESS,
    to: null,
    createdAddress: mismatchedAddress,
    inputData: deployMismatchedHex,
    gasUsed: res2.execResult.executionGasUsed.toString(),
    label: "Deploy MismatchedToken (BLIX)",
  });

  // 3. Deploy AuditRegistry
  const deployRegistryHex = encodeDeployData({
    abi: registryArtifact.abi,
    bytecode: registryArtifact.bytecode,
    args: [],
  });
  const res3 = await evm.runCall({
    caller,
    data: hexToBytes(deployRegistryHex),
    gasLimit: 10_000_000n,
    block: makeEvmBlock(baseBlock + 3, baseTimestamp + 36, DEFAULT_DEPLOYER_ADDRESS),
  });
  if (res3.execResult.exceptionError || !res3.createdAddress) {
    throw new Error(
      `AuditRegistry EVM deployment failed: ${res3.execResult.exceptionError?.error}`
    );
  }
  const registryAddress = getAddress(res3.createdAddress.toString());
  const txHash3 = computeDeterministicTxHash(
    DEFAULT_DEPLOYER_ADDRESS,
    null,
    deployRegistryHex,
    baseBlock + 3,
    2
  );
  transactions.push({
    txHash: txHash3,
    blockNumber: baseBlock + 3,
    timestamp: baseTimestamp + 36,
    from: DEFAULT_DEPLOYER_ADDRESS,
    to: null,
    createdAddress: registryAddress,
    inputData: deployRegistryHex,
    gasUsed: res3.execResult.executionGasUsed.toString(),
    label: "Deploy AuditRegistry",
  });

  const state: PersistedEvmChainState = {
    chainId: 31337,
    chainName: "Local Embedded EVM (Chain ID: 31337)",
    currentBlockNumber: baseBlock + 3,
    deployerAddress: DEFAULT_DEPLOYER_ADDRESS,
    contracts: {
      CompliantToken: compliantAddress,
      MismatchedToken: mismatchedAddress,
      AuditRegistry: registryAddress,
    },
    transactions,
  };

  const stateDir = path.dirname(EVM_STATE_FILE);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(EVM_STATE_FILE, JSON.stringify(state, null, 2), "utf8");

  return {
    mode: "EMBEDDED_EVM",
    chainId: 31337,
    deployer: DEFAULT_DEPLOYER_ADDRESS,
    compliantToken: {
      address: compliantAddress,
      txHash: txHash1,
      blockNumber: baseBlock + 1,
    },
    mismatchedToken: {
      address: mismatchedAddress,
      txHash: txHash2,
      blockNumber: baseBlock + 2,
    },
    auditRegistry: {
      address: registryAddress,
      txHash: txHash3,
      blockNumber: baseBlock + 3,
    },
    state,
  };
}

/**
 * Loads or initializes the persisted EVM chain state and reconstructs the live EVM instance
 * by replaying all recorded deployment and state-transition transactions.
 */
async function getHydratedEmbeddedEvm(): Promise<{
  evm: EVM;
  state: PersistedEvmChainState;
}> {
  if (!fs.existsSync(EVM_STATE_FILE)) {
    await deployAllAuditContracts();
  }
  const state = JSON.parse(
    fs.readFileSync(EVM_STATE_FILE, "utf8")
  ) as PersistedEvmChainState;

  const evm = await createEVM();
  for (const tx of state.transactions) {
    const caller = createAddressFromString(tx.from);
    const to = tx.to ? createAddressFromString(tx.to) : undefined;
    await evm.runCall({
      caller,
      to,
      data: hexToBytes(tx.inputData),
      gasLimit: 10_000_000n,
      block: makeEvmBlock(tx.blockNumber, tx.timestamp, state.deployerAddress),
    });
  }

  return { evm, state };
}

export function getPersistedContractsInfo(): PersistedEvmChainState | null {
  if (!fs.existsSync(EVM_STATE_FILE)) return null;
  try {
    return JSON.parse(
      fs.readFileSync(EVM_STATE_FILE, "utf8")
    ) as PersistedEvmChainState;
  } catch {
    return null;
  }
}

export function getDeployedContractAddresses(): {
  compliantTokenAddress: Hex;
  mismatchedTokenAddress: Hex;
  auditRegistryAddress: Hex;
} {
  const persisted = getPersistedContractsInfo();
  return {
    compliantTokenAddress: (process.env.COMPLIANT_TOKEN_ADDRESS ||
      persisted?.contracts.CompliantToken ||
      "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Hex,
    mismatchedTokenAddress: (process.env.MISMATCHED_TOKEN_ADDRESS ||
      persisted?.contracts.MismatchedToken ||
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as Hex,
    auditRegistryAddress: (process.env.AUDIT_REGISTRY_ADDRESS ||
      persisted?.contracts.AuditRegistry ||
      "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as Hex,
  };
}

/**
 * Executes an ABI-encoded `eth_call` against the target contract address in either
 * the reachable external RPC node or the hydrated Embedded EVM.
 */
async function executeEthCall<T = any>(params: {
  evmContext: {
    mode: "EXTERNAL_RPC" | "EMBEDDED_EVM";
    rpc?: NonNullable<Awaited<ReturnType<typeof getReachableRpcClient>>>;
    evm?: EVM;
    state?: PersistedEvmChainState;
  };
  to: Hex;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}): Promise<{
  decoded: T;
  callData: Hex;
  returnData: Hex;
}> {
  const { evmContext, to, abi, functionName, args = [] } = params;
  const callData = encodeFunctionData({
    abi,
    functionName,
    args: args as any,
  });

  if (evmContext.mode === "EXTERNAL_RPC" && evmContext.rpc) {
    const rawReturn = await evmContext.rpc.publicClient.call({
      to,
      data: callData,
    });
    const returnData = (rawReturn.data || "0x") as Hex;
    const decoded = decodeFunctionResult({
      abi,
      functionName,
      data: returnData,
    }) as T;
    return { decoded, callData, returnData };
  }

  const evm = evmContext.evm!;
  const state = evmContext.state!;
  const res = await evm.runCall({
    caller: createAddressFromString(state.deployerAddress),
    to: createAddressFromString(to),
    data: hexToBytes(callData),
    gasLimit: 2_000_000n,
    block: makeEvmBlock(
      state.currentBlockNumber,
      Math.floor(Date.now() / 1000),
      state.deployerAddress
    ),
  });

  if (res.execResult.exceptionError) {
    throw new Error(
      `eth_call ${functionName}() reverted: ${res.execResult.exceptionError.error}`
    );
  }

  const returnData = bytesToHex(res.execResult.returnValue) as Hex;
  const decoded = decodeFunctionResult({
    abi,
    functionName,
    data: returnData,
  }) as T;

  return { decoded, callData, returnData };
}

/**
 * Reads all 5 mandatory audit categories from the target token contract using real ABI-encoded `eth_call`s.
 */
export async function inspectTokenOnchainState(
  rawTokenAddress: string
): Promise<TokenOnchainSnapshot> {
  // Combine ABIs of CompliantToken and MismatchedToken for universal inspection
  const compliantArtifact = loadContractArtifact("CompliantToken");
  const mismatchedArtifact = loadContractArtifact("MismatchedToken");
  const combinedAbi = [
    ...mismatchedArtifact.abi,
    ...compliantArtifact.abi.filter(
      (item: any) =>
        !mismatchedArtifact.abi.some(
          (m: any) => m.type === item.type && m.name === item.name
        )
    ),
  ] as Abi;

  const rpc = await getReachableRpcClient();
  let evmContext: {
    mode: "EXTERNAL_RPC" | "EMBEDDED_EVM";
    rpc?: NonNullable<typeof rpc>;
    evm?: EVM;
    state?: PersistedEvmChainState;
  };

  if (rpc) {
    evmContext = { mode: "EXTERNAL_RPC", rpc };
  } else {
    const { evm, state } = await getHydratedEmbeddedEvm();
    evmContext = { mode: "EMBEDDED_EVM", evm, state };
  }

  // Resolve legacy placeholder addresses (0x1111... / 0x2222...) to actual deployed addresses if needed
  let tokenAddress = getAddress(rawTokenAddress);
  if (evmContext.state) {
    if (
      rawTokenAddress.toLowerCase() ===
      "0x1111111111111111111111111111111111111111"
    ) {
      tokenAddress = evmContext.state.contracts.CompliantToken;
    } else if (
      rawTokenAddress.toLowerCase() ===
      "0x2222222222222222222222222222222222222222"
    ) {
      tokenAddress = evmContext.state.contracts.MismatchedToken;
    }
  }

  const rawCallTraces: Array<{
    fn: string;
    calldata: Hex;
    rawHex: Hex;
    decoded: string;
  }> = [];

  async function readView<T>(fnName: string, fallbackValue?: T): Promise<T> {
    try {
      const res = await executeEthCall<T>({
        evmContext,
        to: tokenAddress,
        abi: combinedAbi,
        functionName: fnName,
      });
      rawCallTraces.push({
        fn: `${fnName}()`,
        calldata: res.callData,
        rawHex: res.returnData,
        decoded: String(res.decoded),
      });
      return res.decoded;
    } catch (err) {
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw err;
    }
  }

  const name = await readView<string>("name", "Unknown Token");
  const symbol = await readView<string>("symbol", "TOKEN");
  const decimalsNum = Number(await readView<number | bigint>("decimals", 18));

  const totalSupplyBig = await readView<bigint>("totalSupply", 0n);
  const maxSupplyBig = await readView<bigint>(
    "MAX_SUPPLY",
    await readView<bigint>("maxSupply", 0n)
  );
  const mintable = await readView<boolean>("mintable", false);
  const owner = getAddress(
    await readView<Hex>("owner", "0x0000000000000000000000000000000000000000")
  );

  const transferFeeBps = Number(
    await readView<bigint>("transferFeeBps", 0n)
  );
  const maxTransferFeeBps = Number(
    await readView<bigint>("maxTransferFeeBps", BigInt(transferFeeBps))
  );
  const feeMutable = await readView<boolean>("feeMutable", false);
  const feeCollector = getAddress(
    await readView<Hex>(
      "feeCollector",
      "0x0000000000000000000000000000000000000000"
    )
  );

  const paused = await readView<boolean>("paused", false);
  const pausable = await readView<boolean>("pausable", false);
  const blacklistable = await readView<boolean>("blacklistable", false);

  const teamWallet = getAddress(
    await readView<Hex>(
      "teamWallet",
      "0x0000000000000000000000000000000000000000"
    )
  );
  const teamAllocationBig = await readView<bigint>("teamAllocation", 0n);
  const teamLockupActive = await readView<boolean>("teamLockupActive", false);
  const teamLockupReleaseTimestamp = Number(
    await readView<bigint>("teamLockupReleaseTimestamp", 0n)
  );

  const upgradeable = await readView<boolean>("upgradeable", false);
  const adminAddress = getAddress(
    await readView<Hex>(
      "adminAddress",
      "0x0000000000000000000000000000000000000000"
    )
  );
  const logicImplementation = getAddress(
    await readView<Hex>(
      "logicImplementation",
      "0x0000000000000000000000000000000000000000"
    )
  );

  // Inspect EIP-1967 implementation storage slot and account code for owner / admin
  let eip1967SlotValue: Hex =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  let ownerIsContract = false;
  let adminIsContract = false;

  if (evmContext.mode === "EXTERNAL_RPC" && evmContext.rpc) {
    eip1967SlotValue = (await evmContext.rpc.publicClient.getStorageAt({
      address: tokenAddress,
      slot: EIP1967_IMPLEMENTATION_SLOT,
    })) as Hex;
    if (owner !== "0x0000000000000000000000000000000000000000") {
      const code = await evmContext.rpc.publicClient.getCode({ address: owner });
      ownerIsContract = Boolean(code && code !== "0x");
    }
    if (adminAddress !== "0x0000000000000000000000000000000000000000") {
      const code = await evmContext.rpc.publicClient.getCode({
        address: adminAddress,
      });
      adminIsContract = Boolean(code && code !== "0x");
    }
  } else if (evmContext.evm) {
    const slotBytes = await evmContext.evm.stateManager.getStorage(
      createAddressFromString(tokenAddress),
      hexToBytes(EIP1967_IMPLEMENTATION_SLOT)
    );
    if (slotBytes.length > 0) {
      eip1967SlotValue = bytesToHex(slotBytes) as Hex;
    }
    if (owner !== "0x0000000000000000000000000000000000000000") {
      const ownerCode = await evmContext.evm.stateManager.getCode(
        createAddressFromString(owner)
      );
      ownerIsContract = ownerCode.length > 0;
    }
    if (adminAddress !== "0x0000000000000000000000000000000000000000") {
      const adminCode = await evmContext.evm.stateManager.getCode(
        createAddressFromString(adminAddress)
      );
      adminIsContract = adminCode.length > 0;
    }
  }

  let eip1967ImplementationAddress: Hex =
    "0x0000000000000000000000000000000000000000";
  const cleanSlot = eip1967SlotValue.replace(/^0x/, "").padStart(64, "0");
  const last40 = cleanSlot.slice(-40);
  if (!/^0+$/.test(last40)) {
    eip1967ImplementationAddress = getAddress(`0x${last40}`);
  } else if (
    logicImplementation !== "0x0000000000000000000000000000000000000000"
  ) {
    eip1967ImplementationAddress = logicImplementation;
  }

  // Max uint256 check (type(uint256).max > 10^50)
  const isUncappedSupply = maxSupplyBig > 10n ** 36n;
  const totalSupplyFormatted = formatUnits(totalSupplyBig, decimalsNum);
  const maxSupplyFormatted = isUncappedSupply
    ? "UNLIMITED (type(uint256).max)"
    : formatUnits(maxSupplyBig, decimalsNum);
  const teamAllocationFormatted = formatUnits(teamAllocationBig, decimalsNum);

  const blockNumber =
    evmContext.mode === "EXTERNAL_RPC" && evmContext.rpc
      ? evmContext.rpc.blockNumber
      : evmContext.state!.currentBlockNumber;

  const chainId =
    evmContext.mode === "EXTERNAL_RPC" && evmContext.rpc
      ? evmContext.rpc.chainId
      : evmContext.state!.chainId;

  const chainName =
    evmContext.mode === "EXTERNAL_RPC" && evmContext.rpc
      ? evmContext.rpc.chainName
      : evmContext.state!.chainName;

  return {
    mode: evmContext.mode,
    executionMode: evmContext.mode,
    chainId,
    chainName,
    blockNumber,
    tokenAddress,
    name,
    symbol,
    decimals: decimalsNum,
    totalSupplyRaw: totalSupplyBig.toString(),
    totalSupplyFormatted,
    MAX_SUPPLY: maxSupplyBig.toString(),
    maxSupplyRaw: maxSupplyBig.toString(),
    maxSupplyFormatted,
    isUncappedSupply,
    mintable,
    owner,
    ownerIsContract,
    transferFeeBps,
    maxTransferFeeBps,
    feeMutable,
    feeCollector,
    paused,
    pausable,
    blacklistable,
    teamWallet,
    teamAllocationRaw: teamAllocationBig.toString(),
    teamAllocationFormatted,
    teamLockupActive,
    teamLockupReleaseTimestamp,
    teamLockupReleaseIso:
      teamLockupReleaseTimestamp > 0
        ? new Date(teamLockupReleaseTimestamp * 1000).toISOString()
        : null,
    upgradeable,
    adminAddress,
    adminIsContract,
    logicImplementation,
    eip1967SlotValue,
    eip1967ImplementationAddress,
    rawCallTraces,
  };
}

function normalizeBytes32Hex(val: string): Hex {
  const clean = val.trim().replace(/^0x/i, "");
  return `0x${clean.padStart(64, "0").slice(0, 64)}` as Hex;
}

/**
 * Executes `AuditRegistry.recordAudit(...)` on-chain (or in the persistent Embedded EVM)
 * and immediately verifies the anchor using `AuditRegistry.verifyAnchor(...)`.
 */
export async function anchorAuditOnChain(params: {
  documentHash: string;
  tokenAddress: string;
  chainId: number;
  blockNumber: number;
  mismatchCount: number;
  reportHash: string;
}): Promise<AnchorTransactionResult> {
  const registryArtifact = loadContractArtifact("AuditRegistry");
  const documentHashHex = normalizeBytes32Hex(params.documentHash);
  const reportHashHex = normalizeBytes32Hex(params.reportHash);
  const rpc = await getReachableRpcClient();

  if (rpc) {
    const { publicClient, walletClient, account } = rpc;
    const state = getPersistedContractsInfo();
    const registryAddress = (process.env.AUDIT_REGISTRY_ADDRESS ||
      state?.contracts.AuditRegistry) as Hex;
    if (!registryAddress) {
      throw new Error("AuditRegistry address is not configured.");
    }

    const tokenAddressHex = getAddress(params.tokenAddress);
    const recordCallData = encodeFunctionData({
      abi: registryArtifact.abi,
      functionName: "recordAudit",
      args: [
        documentHashHex,
        tokenAddressHex,
        BigInt(params.chainId),
        BigInt(params.blockNumber),
        params.mismatchCount,
        reportHashHex,
      ],
    });

    const txHash = await walletClient.writeContract({
      address: registryAddress,
      abi: registryArtifact.abi,
      functionName: "recordAudit",
      args: [
        documentHashHex,
        tokenAddressHex,
        BigInt(params.chainId),
        BigInt(params.blockNumber),
        params.mismatchCount,
        reportHashHex,
      ],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    const verifyCallData = encodeFunctionData({
      abi: registryArtifact.abi,
      functionName: "verifyAnchor",
      args: [documentHashHex, tokenAddressHex, reportHashHex],
    });
    const rawVerifyCall = await publicClient.call({
      to: registryAddress,
      data: verifyCallData,
    });
    const verifyAnchorRawResult = (rawVerifyCall.data || "0x") as Hex;
    const verifyRes = decodeFunctionResult({
      abi: registryArtifact.abi,
      functionName: "verifyAnchor",
      data: verifyAnchorRawResult,
    }) as [boolean, bigint, number, bigint];

    const anchoredAtTimestamp = Number(verifyRes[3]);
    return {
      executionMode: "EXTERNAL_RPC",
      txHash,
      anchorTxHash: txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      auditRegistryAddress: registryAddress,
      anchoredAtTimestamp,
      anchoredAtIso: new Date(anchoredAtTimestamp * 1000).toISOString(),
      recordAuditCalldata: recordCallData,
      verifyAnchorCalldata: verifyCallData,
      verifyAnchorRawResult,
      verification: {
        verified: Boolean(verifyRes[0]),
        onchainBlockNumber: Number(verifyRes[1]),
        onchainMismatchCount: Number(verifyRes[2]),
        onchainAnchoredAt: anchoredAtTimestamp,
        auditorAddress: account.address,
        record: {
          documentHash: documentHashHex,
          tokenAddress: tokenAddressHex,
          chainId: params.chainId,
          blockNumber: Number(verifyRes[1]),
          mismatchCount: Number(verifyRes[2]),
          reportHash: reportHashHex,
          auditor: account.address,
          anchoredAt: anchoredAtTimestamp,
        },
      },
    };
  }

  // Persistent Embedded EVM execution
  const { evm, state } = await getHydratedEmbeddedEvm();
  const registryAddress = state.contracts.AuditRegistry;

  let resolvedTokenAddress = getAddress(params.tokenAddress);
  if (
    params.tokenAddress.toLowerCase() ===
    "0x1111111111111111111111111111111111111111"
  ) {
    resolvedTokenAddress = state.contracts.CompliantToken;
  } else if (
    params.tokenAddress.toLowerCase() ===
    "0x2222222222222222222222222222222222222222"
  ) {
    resolvedTokenAddress = state.contracts.MismatchedToken;
  }

  // First check via verifyAnchor if this exact reportHash is already anchored
  const checkCallData = encodeFunctionData({
    abi: registryArtifact.abi,
    functionName: "verifyAnchor",
    args: [documentHashHex, resolvedTokenAddress, reportHashHex],
  });
  const preCheckRes = await evm.runCall({
    caller: createAddressFromString(state.deployerAddress),
    to: createAddressFromString(registryAddress),
    data: hexToBytes(checkCallData),
    gasLimit: 500_000n,
    block: makeEvmBlock(
      state.currentBlockNumber,
      Math.floor(Date.now() / 1000),
      state.deployerAddress
    ),
  });
  const preDecoded = decodeFunctionResult({
    abi: registryArtifact.abi,
    functionName: "verifyAnchor",
    data: bytesToHex(preCheckRes.execResult.returnValue) as Hex,
  }) as [boolean, bigint, number, bigint];

  // If already anchored in AuditRegistry, modify reportHash salt slightly
  let finalReportHash = reportHashHex;
  if (preDecoded[0]) {
    finalReportHash = keccak256(
      toHex(`${reportHashHex}:${Date.now()}`)
    );
  }

  const nextBlockNumber = state.currentBlockNumber + 1;
  const nowSec = Math.floor(Date.now() / 1000);

  const recordCallData = encodeFunctionData({
    abi: registryArtifact.abi,
    functionName: "recordAudit",
    args: [
      documentHashHex,
      resolvedTokenAddress,
      BigInt(params.chainId),
      BigInt(params.blockNumber),
      params.mismatchCount,
      finalReportHash,
    ],
  });

  const txRes = await evm.runCall({
    caller: createAddressFromString(state.deployerAddress),
    to: createAddressFromString(registryAddress),
    data: hexToBytes(recordCallData),
    gasLimit: 1_500_000n,
    block: makeEvmBlock(nextBlockNumber, nowSec, state.deployerAddress),
  });

  if (txRes.execResult.exceptionError) {
    throw new Error(
      `AuditRegistry.recordAudit reverted: ${txRes.execResult.exceptionError.error}`
    );
  }

  // Decode emitted AuditAnchored event log from EVM execution
  const logs = txRes.execResult.logs || [];
  if (logs.length > 0) {
    const [, topics, data] = logs[0];
    decodeEventLog({
      abi: registryArtifact.abi,
      eventName: "AuditAnchored",
      topics: topics.map((t) => bytesToHex(t) as Hex) as [Hex, ...Hex[]],
      data: bytesToHex(data) as Hex,
    });
  }

  const txHash = computeDeterministicTxHash(
    state.deployerAddress,
    registryAddress,
    recordCallData,
    nextBlockNumber,
    state.transactions.length
  );

  // Persist transaction to prisma/evm-chain-state.json so future EVM calls see this anchor!
  state.currentBlockNumber = nextBlockNumber;
  state.transactions.push({
    txHash,
    blockNumber: nextBlockNumber,
    timestamp: nowSec,
    from: state.deployerAddress,
    to: registryAddress,
    inputData: recordCallData,
    gasUsed: txRes.execResult.executionGasUsed.toString(),
    label: `AuditRegistry.recordAudit(${finalReportHash.slice(0, 10)}...)`,
  });
  fs.writeFileSync(EVM_STATE_FILE, JSON.stringify(state, null, 2), "utf8");

  // Immediately call verifyAnchor(documentHash, tokenAddress, reportHash) on-chain
  const verifyCallData = encodeFunctionData({
    abi: registryArtifact.abi,
    functionName: "verifyAnchor",
    args: [documentHashHex, resolvedTokenAddress, finalReportHash],
  });
  const verifyRes = await evm.runCall({
    caller: createAddressFromString(state.deployerAddress),
    to: createAddressFromString(registryAddress),
    data: hexToBytes(verifyCallData),
    gasLimit: 500_000n,
    block: makeEvmBlock(nextBlockNumber, nowSec, state.deployerAddress),
  });

  const verifyAnchorRawResult = bytesToHex(verifyRes.execResult.returnValue) as Hex;
  const [verified, onchainBlockNumber, onchainMismatchCount, onchainAnchoredAt] =
    decodeFunctionResult({
      abi: registryArtifact.abi,
      functionName: "verifyAnchor",
      data: verifyAnchorRawResult,
    }) as [boolean, bigint, number, bigint];

  const anchoredAtTimestamp = Number(onchainAnchoredAt);

  return {
    executionMode: "EMBEDDED_EVM",
    txHash,
    anchorTxHash: txHash,
    blockNumber: nextBlockNumber,
    gasUsed: txRes.execResult.executionGasUsed.toString(),
    auditRegistryAddress: registryAddress,
    anchoredAtTimestamp,
    anchoredAtIso: new Date(anchoredAtTimestamp * 1000).toISOString(),
    recordAuditCalldata: recordCallData,
    verifyAnchorCalldata: verifyCallData,
    verifyAnchorRawResult,
    verification: {
      verified,
      onchainBlockNumber: Number(onchainBlockNumber),
      onchainMismatchCount: Number(onchainMismatchCount),
      onchainAnchoredAt: anchoredAtTimestamp,
      auditorAddress: state.deployerAddress,
      record: {
        documentHash: documentHashHex,
        tokenAddress: resolvedTokenAddress,
        chainId: params.chainId,
        blockNumber: Number(onchainBlockNumber),
        mismatchCount: Number(onchainMismatchCount),
        reportHash: finalReportHash,
        auditor: state.deployerAddress,
        anchoredAt: anchoredAtTimestamp,
      },
    },
  };
}
