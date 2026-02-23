/**
 * 管理端商品服务：创建/更新/上下架/库存更新（内存）。
 */
const { store, nextId } = require('../store/memory');

function createProduct(payload) {
  const id = nextId('product');
  const product = {
    id,
    title: String(payload.title),
    price: Math.round(Number(payload.price)),
    status: payload.status === 'OFF' ? 'OFF' : 'ON',
    createdAt: new Date().toISOString(),
  };
  store.products.push(product);
  return product;
}

function updateProduct(id, payload) {
  const product = store.products.find((p) => p.id === String(id));
  if (!product) return null;
  if (payload.title !== undefined) product.title = String(payload.title);
  if (payload.price !== undefined) product.price = Math.round(Number(payload.price));
  if (payload.status !== undefined) product.status = payload.status === 'OFF' ? 'OFF' : 'ON';
  return product;
}

function toggleProduct(id, status) {
  const product = store.products.find((p) => p.id === String(id));
  if (!product) return null;
  product.status = status === 'OFF' ? 'OFF' : 'ON';
  return product;
}

function updateSkuStock(id, payload) {
  const sku = store.productSkus.find((s) => s.id === String(id));
  if (!sku) return null;
  if (payload.stock !== undefined) sku.stock = Math.max(0, Math.round(Number(payload.stock)));
  if (payload.price !== undefined) sku.price = Math.round(Number(payload.price));
  return sku;
}

function createSku(payload) {
  const productId = String(payload.productId);
  const skuName = String(payload.skuName);
  const price = Math.round(Number(payload.price));
  const stock = Math.max(0, Math.round(Number(payload.stock)));
  const exists = store.productSkus.find((s) => s.productId === productId && s.skuName === skuName);
  if (exists) return exists;
  const id = nextId('sku');
  const sku = {
    id,
    productId,
    skuName,
    price,
    stock,
    status: 'ON_SALE',
    createdAt: new Date().toISOString(),
  };
  store.productSkus.push(sku);
  return sku;
}

module.exports = {
  createProduct,
  updateProduct,
  toggleProduct,
  updateSkuStock,
  createSku,
};
