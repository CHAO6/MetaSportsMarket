/* eslint-disable prefer-const */
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { IERC721 } from "../../generated/MetaSportsNFTMarket/IERC721";
import { MetaSportsNFT } from "../../generated/MetaSportsNFTMarket/MetaSportsNFT";

export function fetchName(collectionAddress: Address): string {
  let contract = IERC721.bind(collectionAddress);

  let nameResult = contract.try_name();
  if (!nameResult.reverted) {
    return nameResult.value;
  }

  return "unknown";
}

export function fetchSymbol(collectionAddress: Address): string {
  let contract = IERC721.bind(collectionAddress);

  let symbolResult = contract.try_symbol();
  if (!symbolResult.reverted) {
    return symbolResult.value;
  }

  return "unknown";
}

export function fetchTotalSupply(collectionAddress: Address): BigInt | null {
  let contract = MetaSportsNFT.bind(collectionAddress);

  let symbolResult = contract.try_totalSupply();
  if (!symbolResult.reverted) {
    return symbolResult.value;
  }

  return null;
}

export function fetchTokenURI(collectionAddress: Address, tokenId: BigInt): string | null {
  let contract = MetaSportsNFT.bind(collectionAddress);

  let tokenURIResult = contract.try_tokenURI(tokenId);
  if (!tokenURIResult.reverted) {
    return tokenURIResult.value;
  }

  return null;
}
