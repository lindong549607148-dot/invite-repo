/**
 * 商品服务：最小可用读接口 + 库存预占。
 */
const { store, nextId } = require('../store/memory');
const featureFlags = require('../config/featureFlags');

const PRODUCT_STATUS = {
  ON_SALE: 'ON_SALE',
  OFF: 'OFF',
};

const SKU_STATUS = {
  ON_SALE: 'ON_SALE',
  OFF: 'OFF',
};

function listProducts() {
  return store.products.slice();
}

function getProductDetail(productId) {
  return store.products.find((p) => p.id === String(productId)) || null;
}

function listProductSkus(productId) {
  return store.productSkus.filter((sku) => sku.productId === String(productId));
}

function reserveStock(skuId, qty, options) {
  const enabled = featureFlags.ENABLE_STOCK_DEDUCT;
  const amount = Math.round(Number(qty));
  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn('[stock] invalid qty', qty);
    return { ok: false, err: 'invalid_qty' };
  }
  if (!enabled) {
    console.info('[stock] reserve skipped (feature disabled)', skuId, amount);
    return { ok: true, skipped: true };
  }

  const idempotencyKey = options && options.idempotencyKey ? String(options.idempotencyKey) : '';
  if (!idempotencyKey) {
    console.warn('[stock] idempotency key required', skuId, amount);
    return { ok: false, err: 'idempotency_key_required' };
  }

  const existing = store.stockReservations.find((r) => r.reservationKey === idempotencyKey);
  if (existing) {
    if (existing.skuId !== String(skuId) || existing.qty !== amount) {
      console.warn('[stock] idempotency conflict', idempotencyKey, existing);
      return { ok: false, err: 'idempotency_conflict' };
    }
    return { ok: true, reserved: true, idempotencyKey };
  }

  const sku = store.productSkus.find((s) => s.id === String(skuId));
  if (!sku) {
    console.warn('[stock] sku not found', skuId);
    return { ok: false, err: 'sku_not_found' };
  }
  if (sku.status !== SKU_STATUS.ON_SALE) {
    console.warn('[stock] sku not on sale', skuId, sku.status);
    return { ok: false, err: 'sku_not_on_sale' };
  }
  if (typeof sku.stock !== 'number' || sku.stock < amount) {
    console.warn('[stock] insufficient stock', skuId, sku.stock, amount);
    return { ok: false, err: 'insufficient_stock' };
  }

  sku.stock -= amount;
  store.stockReservations.push({
    reservationKey: idempotencyKey,
    skuId: String(skuId),
    qty: amount,
    status: 'RESERVED',
    createdAt: new Date().toISOString(),
  });
  console.info('[stock] reserved', skuId, amount);
  return { ok: true, reserved: true, idempotencyKey };
}

function releaseReservedStock({ orderId, skuId, qty }) {
  const ref = store.orderStockReservations && store.orderStockReservations[orderId];
  const finalSkuId = ref ? ref.skuId : skuId;
  const finalQty = ref ? ref.qty : qty;
  if (!finalSkuId || !finalQty) {
    console.info('[stock] release skipped (no reservation)', orderId);
    return { ok: true, skipped: true };
  }
  if (ref && ref.released) {
    return { ok: true, skipped: true };
  }
  const sku = store.productSkus.find((s) => s.id === String(finalSkuId));
  if (!sku) {
    console.warn('[stock] release sku not found', orderId, finalSkuId);
    if (ref) {
      ref.released = true;
      delete store.orderStockReservations[orderId];
    }
    return { ok: true, skipped: true };
  }
  const addQty = Math.max(0, Math.round(Number(finalQty)));
  sku.stock = Math.max(0, Math.round(Number(sku.stock || 0)) + addQty);
  console.log('[stock] released', { orderId, skuId: finalSkuId, qty: addQty });
  if (ref) {
    ref.released = true;
    delete store.orderStockReservations[orderId];
  }
  return { ok: true };
}

function seedProduct({ title, coverImage, price, originalPrice, status, categoryId }) {
  const id = nextId('product');
  const product = {
    id,
    title,
    coverImage: coverImage || '',
    price: Math.round(Number(price)),
    originalPrice: Math.round(Number(originalPrice || price)),
    status: status || PRODUCT_STATUS.ON_SALE,
    categoryId: categoryId || 'default',
    createdAt: new Date().toISOString(),
  };
  store.products.push(product);
  return product;
}

function seedSku({ productId, skuName, price, stock, status }) {
  const id = nextId('sku');
  const sku = {
    id,
    productId: String(productId),
    skuName: skuName || 'default',
    price: Math.round(Number(price)),
    stock: Math.round(Number(stock || 0)),
    status: status || SKU_STATUS.ON_SALE,
    createdAt: new Date().toISOString(),
  };
  store.productSkus.push(sku);
  return sku;
}

module.exports = {
  PRODUCT_STATUS,
  SKU_STATUS,
  listProducts,
  getProductDetail,
  listProductSkus,
  reserveStock,
  releaseReservedStock,
  seedProduct,
  seedSku,
};
