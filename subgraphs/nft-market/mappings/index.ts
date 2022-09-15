/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Collection, NFT, AskOrder, Transaction, User } from "../generated/schema";
import {
  AskCancel,
  AskNew,
  AskUpdate,
  CollectionClose,
  CollectionNew,
  CollectionUpdate,
  RevenueClaim,
  Trade,
} from "../generated/MetaSportsNFTMarket/MetaSportsNFTMarket";
import { toBigDecimal } from "./utils";
import { updateCollectionDayData, updateMarketPlaceDayData } from "./utils/dayUpdates";
import {fetchName, fetchSymbol, fetchTokenURI, fetchTotalSupply} from "./utils/erc721";

// Constants
let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// BigNumber-like references
let ZERO_BI = BigInt.fromI32(0);
let ONE_BI = BigInt.fromI32(1);
let ZERO_BD = BigDecimal.fromString("0");

/**
 * COLLECTION(S)
 */

export function handleCollectionNew(event: CollectionNew): void {
  let collection = Collection.load(event.params.collection.toHex());
  if (collection === null) {
    collection = new Collection(event.params.collection.toHex());
    collection.name = fetchName(event.params.collection);
    collection.symbol = fetchSymbol(event.params.collection);
    collection.active = true;
    collection.totalTrades = ZERO_BI;
    collection.totalSupply = fetchTotalSupply(event.params.collection);
    collection.totalVolumeToken = ZERO_BD;
    collection.numberTokensListed = ZERO_BI;
    collection.creatorAddress = event.params.creator;
    collection.tradingFee = toBigDecimal(event.params.tradingFee, 2);
    collection.creatorFee = toBigDecimal(event.params.creatorFee, 2);
    collection.whitelistChecker = event.params.whitelistChecker;
    collection.save();
  }
  collection.active = true;
  collection.creatorAddress = event.params.creator;
  collection.tradingFee = toBigDecimal(event.params.tradingFee, 2);
  collection.creatorFee = toBigDecimal(event.params.creatorFee, 2);
  collection.whitelistChecker = event.params.whitelistChecker;
  collection.save();
}

export function handleCollectionClose(event: CollectionClose): void {
  let collection = Collection.load(event.params.collection.toHex());
  if (collection !== null) {
    collection.active = false;
    collection.save();
  }
}

export function handleCollectionUpdate(event: CollectionUpdate): void {
  let collection = Collection.load(event.params.collection.toHex());
  if (collection !== null) {
    collection.creatorAddress = event.params.creator;
    collection.tradingFee = toBigDecimal(event.params.tradingFee, 2);
    collection.creatorFee = toBigDecimal(event.params.creatorFee, 2);
    collection.totalSupply = fetchTotalSupply(event.params.collection);
    collection.whitelistChecker = event.params.whitelistChecker;
    collection.save();
  }
}

/**
 * ASK ORDERS
 */

export function handleAskNew(event: AskNew): void {
  let user = User.load(event.params.seller.toHex());
  if (user === null) {
    user = new User(event.params.seller.toHex());
    user.numberTokensListed = ONE_BI;
    user.numberTokensPurchased = ZERO_BI;
    user.numberTokensSold = ZERO_BI;
    user.tokenAddress = event.params.tokenAddress.toHex();
    user.totalVolumeInTokensPurchased = ZERO_BD;
    user.totalVolumeInTokensSold = ZERO_BD;
    user.totalFeesCollectedInToken = ZERO_BD;
    user.averageTokenPriceInTokenPurchased = ZERO_BD;
    user.averageTokenPriceInTokenSold = ZERO_BD;
    user.save();
  }
  user.numberTokensListed = user.numberTokensListed.plus(ONE_BI);
  user.save();

  let collection = Collection.load(event.params.collection.toHex());
  collection.numberTokensListed = collection.numberTokensListed.plus(ONE_BI);
  collection.totalSupply = fetchTotalSupply(event.params.collection);
  collection.save();

  let token = NFT.load(event.params.collection.toHex() + "-" + event.params.tokenId.toString());
  if (token === null) {
    token = new NFT(event.params.collection.toHex() + "-" + event.params.tokenId.toString());
    token.tokenId = event.params.tokenId;
    token.tokenAddress = event.params.tokenAddress.toHex();
    token.collection = collection.id;
    token.metadataUrl = fetchTokenURI(event.params.collection, event.params.tokenId);
    token.updatedAt = event.block.timestamp;
    token.currentAskPrice = toBigDecimal(event.params.askPrice, 18);
    token.currentSeller = event.params.seller.toHex();
    token.latestTradedPriceInToken = ZERO_BD;
    token.tradeVolumeToken = ZERO_BD;
    token.totalTrades = ZERO_BI;
    token.isTradable = true;
    token.save();
  }
  token.updatedAt = event.block.timestamp;
  token.currentAskPrice = toBigDecimal(event.params.askPrice, 18);
  token.currentSeller = event.params.seller.toHex();
  token.isTradable = true;
  token.save();

  let order = new AskOrder(event.transaction.hash.toHex());
  order.block = event.block.number;
  order.timestamp = event.block.timestamp;
  order.collection = collection.id;
  order.nft = token.id;
  order.orderType = "New";
  order.askPrice = toBigDecimal(event.params.askPrice, 18);
  order.tokenAddress = event.params.tokenAddress.toHex();
  order.seller = user.id;
  order.save();
}

export function handleAskCancel(event: AskCancel): void {
  let user = User.load(event.params.seller.toHex());
  if (user !== null) {
    user.numberTokensListed = user.numberTokensListed.minus(ONE_BI);
    user.save();
  }

  let collection = Collection.load(event.params.collection.toHex());
  if (collection != null) {
    collection.numberTokensListed = collection.numberTokensListed.minus(ONE_BI);
    collection.save();
  }

  let token = NFT.load(event.params.collection.toHex() + "-" + event.params.tokenId.toString());
  if (token !== null) {
    token.currentSeller = ZERO_ADDRESS;
    token.updatedAt = event.block.timestamp;
    token.currentAskPrice = ZERO_BD;
    token.isTradable = false;
    token.save();
  }

  if (token !== null && collection !== null) {
    let order = new AskOrder(event.transaction.hash.toHex());
    order.block = event.block.number;
    order.timestamp = event.block.timestamp;
    order.collection = collection.id;
    order.nft = token.id;
    order.orderType = "Cancel";
    order.askPrice = toBigDecimal(ZERO_BI, 18);
    order.seller = event.params.seller.toHex();
    order.save();
  }
}

export function handleAskUpdate(event: AskUpdate): void {
  let token = NFT.load(event.params.collection.toHex() + "-" + event.params.tokenId.toString());
  if (token !== null) {
    token.updatedAt = event.block.timestamp;
    token.currentAskPrice = toBigDecimal(event.params.askPrice, 18);
    token.tokenAddress = event.params.tokenAddress.toHex();
    token.save();

    let order = new AskOrder(event.transaction.hash.toHex());
    order.block = event.block.number;
    order.timestamp = event.block.timestamp;
    order.collection = token.collection;
    order.nft = token.id;
    order.orderType = "Modify";
    order.askPrice = toBigDecimal(event.params.askPrice, 18);
    order.tokenAddress = event.params.tokenAddress.toHex();
    order.seller = event.params.seller.toHex();
    order.save();
  }
}

/**
 * BUY ORDERS
 */

export function handleTrade(event: Trade): void {
  // 1. Buyer
  let buyer = User.load(event.params.buyer.toHex());

  // Buyer may not exist
  if (buyer === null) {
    buyer = new User(event.params.buyer.toHex());
    buyer.numberTokensListed = ZERO_BI;
    buyer.numberTokensPurchased = ONE_BI; // 1 token purchased
    buyer.numberTokensSold = ZERO_BI;
    buyer.tokenAddress = event.params.tokenAddress.toHex();
    buyer.totalVolumeInTokensPurchased = toBigDecimal(event.params.askPrice, 18);
    buyer.totalVolumeInTokensSold = ZERO_BD;
    buyer.totalFeesCollectedInToken = ZERO_BD;
    buyer.averageTokenPriceInTokenPurchased = buyer.totalVolumeInTokensPurchased;
    buyer.averageTokenPriceInTokenSold = ZERO_BD;
  } else {
    buyer.numberTokensPurchased = buyer.numberTokensPurchased.plus(ONE_BI);
    buyer.totalVolumeInTokensPurchased = buyer.totalVolumeInTokensPurchased.plus(
      toBigDecimal(event.params.askPrice, 18)
    );

    buyer.averageTokenPriceInTokenPurchased = buyer.totalVolumeInTokensPurchased.div(
      buyer.numberTokensPurchased.toBigDecimal()
    );
  }

  // 2. Seller
  let seller = User.load(event.params.seller.toHex());

  seller.numberTokensSold = seller.numberTokensSold.plus(ONE_BI);
  seller.numberTokensListed = seller.numberTokensListed.minus(ONE_BI);
  seller.totalVolumeInTokensSold = seller.totalVolumeInTokensSold.plus(toBigDecimal(event.params.netPrice, 18));
  seller.averageTokenPriceInTokenSold = seller.totalVolumeInTokensSold.div(seller.numberTokensSold.toBigDecimal());

  // 3. Collection
  let collection = Collection.load(event.params.collection.toHex());
  if (collection !== null) {
    collection.totalTrades = collection.totalTrades.plus(ONE_BI);
    collection.totalVolumeToken = collection.totalVolumeToken.plus(toBigDecimal(event.params.askPrice, 18));
    collection.numberTokensListed = collection.numberTokensListed.minus(ONE_BI);
    collection.save();
  }

  // 4. NFT
  let tokenConcatId = event.params.collection.toHex() + "-" + event.params.tokenId.toString();
  let token = NFT.load(tokenConcatId);

  token.latestTradedPriceInToken = toBigDecimal(event.params.askPrice, 18);
  token.tradeVolumeToken = token.tradeVolumeToken.plus(token.latestTradedPriceInToken);
  token.tokenAddress = event.params.tokenAddress.toHex();
  token.updatedAt = event.block.timestamp;
  token.totalTrades = token.totalTrades.plus(ONE_BI);
  token.currentAskPrice = ZERO_BD;
  token.currentSeller = ZERO_ADDRESS;
  token.isTradable = false;

  // 5. Transaction
  let transaction = new Transaction(event.transaction.hash.toHex());

  transaction.block = event.block.number;
  transaction.timestamp = event.block.timestamp;
  transaction.collection = event.params.collection.toHex();
  transaction.nft = event.params.collection.toHex() + "-" + event.params.tokenId.toString();
  transaction.askPrice = toBigDecimal(event.params.askPrice, 18);
  transaction.netPrice = toBigDecimal(event.params.netPrice, 18);

  transaction.buyer = event.params.buyer.toHex();
  transaction.seller = event.params.seller.toHex();

  transaction.tokenAddress = event.params.tokenAddress.toHex();

  transaction.save();
  buyer.save();
  seller.save();
  token.save();

  updateCollectionDayData(event.params.collection, toBigDecimal(event.params.askPrice, 18), event);
  updateMarketPlaceDayData(toBigDecimal(event.params.askPrice, 18), event);
}

/**
 * ROYALTIES
 */

export function handleRevenueClaim(event: RevenueClaim): void {
  let user = User.load(event.params.claimer.toHex());
  if (user === null) {
    user = new User(event.params.claimer.toHex());
    user.numberTokensListed = ZERO_BI;
    user.numberTokensPurchased = ZERO_BI;
    user.numberTokensSold = ZERO_BI;
    user.tokenAddress = event.params.tokenAddress.toHex();
    user.totalVolumeInTokensPurchased = ZERO_BD;
    user.totalVolumeInTokensSold = ZERO_BD;
    user.totalFeesCollectedInToken = ZERO_BD;
    user.averageTokenPriceInTokenPurchased = ZERO_BD;
    user.averageTokenPriceInTokenSold = ZERO_BD;
    user.save();
  }
  user.totalFeesCollectedInToken = user.totalFeesCollectedInToken.plus(toBigDecimal(event.params.amount, 18));
  user.save();
}
