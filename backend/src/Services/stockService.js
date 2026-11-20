const mongoose = require("mongoose");
const Product = require("../Model/productModel");
const { isCustomSilver } = require("./pricingService");

/**
 * Stock keeping. A piece's stock is reserved when it's ordered (so two
 * customers can't both order the last one while the shop is still confirming)
 * and returned when the order is cancelled or deleted before completion.
 * Custom silver pieces are made to order and have no stock.
 *
 * Every change is one atomic database update that only succeeds while enough
 * stock is left, so simultaneous checkouts can't oversell.
 */

const tracksStock = (product) => Boolean(product) && !isCustomSilver(product);

// stockQuantity lives on the product type schemas (silver/gold/metal), which
// the base Product model doesn't know, so updates go to the collection directly
const collection = () => Product.collection;
const toId = (product) => new mongoose.Types.ObjectId(String(product?._id || product));

class StockError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "StockError";
    this.status = 409;
    this.details = details;
  }
}

async function stockLeft(product) {
  const doc = await collection().findOne({ _id: toId(product) }, { projection: { stockQuantity: 1 } });
  return Math.max(0, Number(doc?.stockQuantity) || 0);
}

const shortageMessage = (title, left) =>
  left > 0 ? `Only ${left} of "${title}" ${left === 1 ? "is" : "are"} left.` : `"${title}" is out of stock.`;

/** Takes `quantity` from stock if that many are left. Returns whether it did. */
async function takeStock(product, quantity) {
  if (!(quantity > 0)) return true;
  const result = await collection().updateOne(
    { _id: toId(product), stockQuantity: { $gte: quantity } },
    { $inc: { stockQuantity: -quantity } }
  );
  return result.modifiedCount === 1;
}

async function returnStock(product, quantity) {
  if (!(quantity > 0)) return;
  await collection().updateOne({ _id: toId(product) }, { $inc: { stockQuantity: quantity } });
}

/**
 * Reserves several lines ({ product, quantity, title }) together: either all
 * of them or none. Throws a StockError naming the first one that's short.
 */
async function reserveAll(lines) {
  const taken = [];
  for (const line of lines) {
    if (await takeStock(line.product, line.quantity)) {
      taken.push(line);
      continue;
    }
    for (const done of taken) await returnStock(done.product, done.quantity);
    const left = await stockLeft(line.product);
    throw new StockError(shortageMessage(line.title, left), { productId: String(toId(line.product)), available: left });
  }
  return taken;
}

const releaseAll = async (lines) => {
  for (const line of lines) await returnStock(line.product, line.quantity);
};

/**
 * Makes the stock an order holds match its status and quantity: a cancelled
 * order holds none, any other holds its quantity. Orders placed before stock
 * keeping existed (stockTracked not set) are left alone.
 * Updates order.stockReserved (the caller saves the order) and returns an
 * undo function for when saving then fails.
 */
async function syncOrderStock(order, title = "This product") {
  const held = order.stockReserved || 0;
  const wanted = order.stockTracked && order.status !== "cancelled" ? order.quantity : 0;
  if (wanted > held) {
    if (!(await takeStock(order.product, wanted - held))) {
      const left = await stockLeft(order.product);
      throw new StockError(`Not enough stock: ${shortageMessage(title, left)}`, { available: left });
    }
  } else if (wanted < held) {
    await returnStock(order.product, held - wanted);
  }
  order.stockReserved = wanted;
  return async () => {
    if (wanted > held) await returnStock(order.product, wanted - held);
    else if (wanted < held) await takeStock(order.product, held - wanted);
    order.stockReserved = held;
  };
}

module.exports = { tracksStock, stockLeft, takeStock, returnStock, reserveAll, releaseAll, syncOrderStock, shortageMessage, StockError };
