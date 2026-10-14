/**
 * Returns the Sepolia (or Mainnet) Etherscan URL for a smart contract / wallet address
 * when `chainId === 11155111` (Ethereum Sepolia) or `chainId === 1`.
 */
export function getEtherscanAddressUrl(
  chainId: number,
  address?: string | null
): string | null {
  if (!address || !address.startsWith("0x")) return null;
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/address/${address}`;
  }
  if (chainId === 1) {
    return `https://etherscan.io/address/${address}`;
  }
  return null;
}

/**
 * Returns the Sepolia (or Mainnet) Etherscan URL for a transaction hash
 * when `chainId === 11155111` (Ethereum Sepolia) or `chainId === 1`.
 */
export function getEtherscanTxUrl(
  chainId: number,
  txHash?: string | null
): string | null {
  if (!txHash || !txHash.startsWith("0x")) return null;
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  if (chainId === 1) {
    return `https://etherscan.io/tx/${txHash}`;
  }
  return null;
}
