import mongoose from 'mongoose';
import Cart from '../models/Cart.js';

/**
 * Calculates the total quantity of a product currently reserved in all user carts.
 * @param {string|mongoose.Types.ObjectId} productId 
 * @returns {Promise<number>}
 */
export const getReservedStock = async (productId) => {
  try {
    const result = await Cart.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.product': new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error(`Error calculating reserved stock for product ${productId}:`, error);
    return 0;
  }
};

/**
 * Calculates total quantity reserved in all user carts for a list of products.
 * @param {Array<string|mongoose.Types.ObjectId>} productIds 
 * @returns {Promise<Object>} Map of productId string to total reserved quantity
 */
export const getReservedStocksForProducts = async (productIds) => {
  try {
    if (!productIds || productIds.length === 0) return {};
    const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));
    const results = await Cart.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.product': { $in: objectIds } } },
      { $group: { _id: '$items.product', total: { $sum: '$items.quantity' } } }
    ]);
    const map = {};
    results.forEach(r => {
      map[r._id.toString()] = r.total;
    });
    return map;
  } catch (error) {
    console.error('Error calculating reserved stocks for product list:', error);
    return {};
  }
};
