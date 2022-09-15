/* eslint-disable prefer-const */
import { Address, BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { CollectionDayData, MarketPlaceDayData } from "../../generated/schema";

// BigNumber-like references
let ZERO_BI = BigInt.fromI32(0);
let ONE_BI = BigInt.fromI32(1);
let ZERO_BD = BigDecimal.fromString("0");

export function updateMarketPlaceDayData(newVolumeInToken: BigDecimal, event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;

  let marketPlaceDayData = MarketPlaceDayData.load(dayID.toString());
  if (marketPlaceDayData === null) {
    marketPlaceDayData = new MarketPlaceDayData(dayID.toString());
    marketPlaceDayData.date = dayStartTimestamp;
    marketPlaceDayData.dailyVolumeToken = ZERO_BD;
    marketPlaceDayData.dailyTrades = ZERO_BI;
  }
  marketPlaceDayData.dailyVolumeToken = marketPlaceDayData.dailyVolumeToken.plus(newVolumeInToken);
  marketPlaceDayData.dailyTrades = marketPlaceDayData.dailyTrades.plus(ONE_BI);
  marketPlaceDayData.save();
}

export function updateCollectionDayData(collection: Address, newVolumeInToken: BigDecimal, event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let ID = dayID.toString() + "-" + collection.toHex();

  let collectionDayData = CollectionDayData.load(ID);
  if (collectionDayData === null) {
    collectionDayData = new CollectionDayData(ID);
    collectionDayData.date = dayStartTimestamp;
    collectionDayData.collection = collection.toHex();
    collectionDayData.dailyVolumeToken = ZERO_BD;
    collectionDayData.dailyTrades = ZERO_BI;
  }
  collectionDayData.dailyVolumeToken = collectionDayData.dailyVolumeToken.plus(newVolumeInToken);
  collectionDayData.dailyTrades = collectionDayData.dailyTrades.plus(ONE_BI);
  collectionDayData.save();
}
