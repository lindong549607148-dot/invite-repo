/**
 * 管理端商品与库存管理接口。
 */
const express = require('express');
const { ok, fail, BAD_REQUEST } = require('../utils/resp');
const adminProductService = require('../services/adminProductService');

const router = express.Router();

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.post('/products/create', (req, res) => {
  requireBody(req, res, ['title', 'price'], () => {
    const { title, price, status } = req.body;
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const product = adminProductService.createProduct({ title, price: priceNum, status });
    return res.json(ok(product));
  });
});

router.post('/products/update', (req, res) => {
  requireBody(req, res, ['id'], () => {
    const { id, title, price, status } = req.body;
    if (price !== undefined) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
    }
    const product = adminProductService.updateProduct(id, { title, price, status });
    if (!product) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    return res.json(ok(product));
  });
});

router.post('/products/toggle', (req, res) => {
  requireBody(req, res, ['id', 'status'], () => {
    const { id, status } = req.body;
    if (status !== 'ON' && status !== 'OFF') {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const product = adminProductService.toggleProduct(id, status);
    if (!product) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    return res.json(ok(product));
  });
});

router.post('/sku/update-stock', (req, res) => {
  requireBody(req, res, ['id'], () => {
    const { id, stock, price } = req.body;
    if (stock === undefined && price === undefined) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    if (stock !== undefined) {
      const stockNum = Number(stock);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
    }
    if (price !== undefined) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
    }
    const sku = adminProductService.updateSkuStock(id, { stock, price });
    if (!sku) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    return res.json(ok(sku));
  });
});

router.post('/sku/create', (req, res) => {
  requireBody(req, res, ['productId', 'skuName', 'price', 'stock'], () => {
    const { productId, skuName, price, stock } = req.body;
    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const sku = adminProductService.createSku({ productId, skuName, price: priceNum, stock: stockNum });
    return res.json(ok(sku));
  });
});

module.exports = router;
