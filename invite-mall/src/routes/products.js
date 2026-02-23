/**
 * 商品路由（只读）：列表、详情、SKU。
 */
const express = require('express');
const productService = require('../services/productService');
const { ok, fail, FORBIDDEN } = require('../utils/resp');
const featureFlags = require('../config/featureFlags');

const router = express.Router();

router.get('/', (req, res) => {
  if (!featureFlags.ENABLE_PRODUCT_MODULE) {
    return res.status(403).json(fail(FORBIDDEN, 'feature_disabled'));
  }
  const list = productService.listProducts();
  return res.json(ok(list));
});

router.get('/:id', (req, res) => {
  if (!featureFlags.ENABLE_PRODUCT_MODULE) {
    return res.status(403).json(fail(FORBIDDEN, 'feature_disabled'));
  }
  const item = productService.getProductDetail(req.params.id);
  return res.json(ok(item));
});

router.get('/:id/skus', (req, res) => {
  if (!featureFlags.ENABLE_PRODUCT_MODULE) {
    return res.status(403).json(fail(FORBIDDEN, 'feature_disabled'));
  }
  const list = productService.listProductSkus(req.params.id);
  return res.json(ok(list));
});

module.exports = router;
